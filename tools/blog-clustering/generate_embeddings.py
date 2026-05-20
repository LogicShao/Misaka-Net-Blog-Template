#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import sys

# Force offline mode before any HF imports
os.environ["HF_HUB_OFFLINE"] = "1"
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path

import frontmatter
import hdbscan
import numpy as np
import torch
import umap
from sentence_transformers import SentenceTransformer


@dataclass
class PostRecord:
    title: str
    slug: str
    date: str
    content: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate clustering data for the blog galaxy visualization."
    )
    repo_root = Path(__file__).resolve().parents[2]
    parser.add_argument(
        "--input-dir",
        default=str(repo_root / "src" / "content" / "blog"),
        help="Path to blog content directory.",
    )
    parser.add_argument(
        "--output",
        default=str(repo_root / "src" / "data" / "clusters.json"),
        help="Output JSON path.",
    )
    parser.add_argument("--clusters", type=int, default=5, help="KMeans cluster count.")
    parser.add_argument(
        "--batch-size", type=int, default=4, help="Embedding batch size."
    )
    parser.add_argument("--seed", type=int, default=42, help="Random seed.")
    parser.add_argument(
        "--model",
        default="BAAI/bge-m3",
        help="SentenceTransformer model name.",
    )
    parser.add_argument(
        "--max-length",
        type=int,
        default=1024,
        help="Max sequence length for embeddings.",
    )
    parser.add_argument(
        "--device",
        choices=("auto", "cuda", "cpu"),
        default="auto",
        help="Embedding device selection.",
    )
    parser.add_argument(
        "--precision",
        choices=("fp16", "fp32"),
        default="fp16",
        help="Embedding precision for GPU.",
    )

    return parser.parse_args()


def normalize_date(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return ""
        for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y.%m.%d"):
            try:
                return datetime.strptime(raw, fmt).date().isoformat()
            except ValueError:
                continue
        try:
            return datetime.fromisoformat(raw).date().isoformat()
        except ValueError:
            return raw
    return str(value)


def strip_markdown(text: str) -> str:
    cleaned = re.sub(r"```.*?```", " ", text, flags=re.S)
    cleaned = re.sub(r"`[^`]*`", " ", cleaned)
    cleaned = re.sub(r"!\[([^\]]*)\]\([^\)]*\)", r"\1", cleaned)
    cleaned = re.sub(r"\[([^\]]+)\]\([^\)]*\)", r"\1", cleaned)
    cleaned = re.sub(r"<[^>]+>", " ", cleaned)
    cleaned = re.sub(r"[#>*_~`]+", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()


def load_posts(content_dir: Path) -> list[PostRecord]:
    posts: list[PostRecord] = []
    for path in sorted(content_dir.rglob("*")):
        if path.suffix.lower() not in {".md", ".mdx"}:
            continue
        post = frontmatter.load(path)
        meta = post.metadata or {}
        if meta.get("draft") is True:
            continue
        title = str(meta.get("title") or path.stem)
        date_value = meta.get("pubDate") or meta.get("date")
        date_str = normalize_date(date_value)
        slug = path.relative_to(content_dir).with_suffix("").as_posix()
        body = strip_markdown(post.content)
        if not body:
            body = title
        posts.append(PostRecord(title=title, slug=slug, date=date_str, content=body))
    return posts

def main() -> int:
    args = parse_args()
    repo_root = Path(__file__).resolve().parents[2]
    content_dir = Path(args.input_dir)
    output_path = Path(args.output)

    if not content_dir.exists():
        print(f"Input directory not found: {content_dir}", file=sys.stderr)
        return 1

    posts = load_posts(content_dir)
    if not posts:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text("[]\n", encoding="utf-8")
        print("No posts found. Wrote empty clusters.json.")
        return 0

    if args.device == "auto":
        device = "cuda" if torch.cuda.is_available() else "cpu"
    else:
        device = args.device
        if device == "cuda" and not torch.cuda.is_available():
            print("CUDA requested but not available. Falling back to CPU.", file=sys.stderr)
            device = "cpu"

    if device != "cuda":
        print("CUDA not available. Falling back to CPU.", file=sys.stderr)

    precision = args.precision if device == "cuda" else "fp32"

    model_dir = repo_root / "model"
    model_dir.mkdir(parents=True, exist_ok=True)
    # Use local snapshot path if exists, otherwise fall back to model name
    local_model_path = model_dir / "models--BAAI--bge-m3" / "snapshots" / "5617a9f61b028005a4858fdac845db406aefb181"
    if local_model_path.exists():
        model_path = str(local_model_path)
    else:
        model_path = args.model

    model = SentenceTransformer(
        model_path,
        device=device,
        cache_folder=str(model_dir),
    )
    if args.max_length:
        model.max_seq_length = args.max_length
    embeddings = model.encode(
        [post.content for post in posts],
        batch_size=args.batch_size,
        normalize_embeddings=True,
        show_progress_bar=True,
    )
    embeddings = np.asarray(embeddings)

    if len(posts) == 1:
        labels = np.array([0], dtype=int)
        vis_embedding = np.array([[0.0, 0.0]], dtype=float)
    elif len(posts) == 2:
        labels = np.array([0, 1], dtype=int)
        vis_embedding = np.array([[-1.0, 0.0], [1.0, 0.0]], dtype=float)
    else:
        cluster_components = min(50, max(2, len(posts) - 2), embeddings.shape[1])
        vis_neighbors = min(15, len(posts) - 1)

        # Stage 1: UMAP 1024D → 50D for clustering (cosine, tight clusters)
        print("Reducing to 50D for clustering...")
        clusterable_embedding = umap.UMAP(
            n_neighbors=vis_neighbors,
            min_dist=0.0,
            n_components=cluster_components,
            metric='cosine',
            random_state=args.seed
        ).fit_transform(embeddings)

        # Stage 2: HDBSCAN density-based clustering on 50D
        print("Running HDBSCAN clustering...")
        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=min(5, max(3, len(posts) // 10)),
            min_samples=3,
            metric='euclidean'
        )
        labels = clusterer.fit_predict(clusterable_embedding)

        # Stage 3: UMAP 50D → 2D for visualization (euclidean, spread points)
        print("Reducing to 2D for visualization...")
        vis_embedding = umap.UMAP(
            n_neighbors=vis_neighbors,
            min_dist=0.1,
            n_components=2,
            metric='euclidean',
            random_state=args.seed
        ).fit_transform(clusterable_embedding)

    output_records = []
    for idx, post in enumerate(posts):
        output_records.append(
            {
                "title": post.title,
                "slug": post.slug,
                "date": post.date,
                "cluster": int(labels[idx]),
                "x": float(vis_embedding[idx, 0]),
                "y": float(vis_embedding[idx, 1]),
            }
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(output_records, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    print(f"Wrote {len(output_records)} posts to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
