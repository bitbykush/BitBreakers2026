import logging
import numpy as np
from typing import List, Union
from app.config import get_settings

logger = logging.getLogger("udyamsetu.embedding")


class FastEmbedSingleton:
    """
    Singleton wrapper for FastEmbed ONNX TextEmbedding.
    Ensures model weights (quantized INT8 ~60MB RAM) are loaded into memory exactly ONCE.
    Strictly forbids PyTorch/Paddle imports to stay under Render's 512MB RAM ceiling.
    """
    _instance = None
    _model = None
    _mock_mode = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FastEmbedSingleton, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        settings = get_settings()
        self._mock_mode = settings.MOCK_MODE
        if self._mock_mode:
            logger.info("FastEmbed initialized in MOCK_MODE (synthetic 384-dim vectors).")
            return

        try:
            logger.info(f"Loading FastEmbed ONNX model: {settings.EMBEDDING_MODEL}")
            from fastembed import TextEmbedding
            self._model = TextEmbedding(model_name=settings.EMBEDDING_MODEL)
            logger.info("FastEmbed ONNX model loaded successfully into memory.")
        except Exception as e:
            logger.warning(
                f"Failed to initialize FastEmbed ONNX ({e}). Falling back to deterministic mock vectors."
            )
            self._mock_mode = True

    def set_mock_mode(self, enabled: bool):
        """Allows toggling mock mode dynamically from the Dev HUD."""
        self._mock_mode = enabled
        logger.info(f"FastEmbed mock mode set to: {enabled}")

    def is_mock_mode(self) -> bool:
        return self._mock_mode

    def _generate_mock_vector(self, text: str, dim: int = 384) -> np.ndarray:
        """Deterministic pseudo-embedding for testing or offline environments."""
        seed = sum(ord(c) for c in text) % (2**32)
        rng = np.random.default_rng(seed)
        vec = rng.standard_normal(dim)
        norm = np.linalg.norm(vec)
        return (vec / norm) if norm > 0 else vec

    def embed(self, texts: Union[str, List[str]]) -> List[np.ndarray]:
        """
        Generates normalized embedding vectors for a list of texts or a single string.
        Returns a list of numpy arrays (384-dim).
        """
        if isinstance(texts, str):
            texts = [texts]

        if not texts:
            return []

        if self._mock_mode or self._model is None:
            return [self._generate_mock_vector(t) for t in texts]

        try:
            # fastembed.embed returns a generator of numpy arrays
            raw_embeddings = list(self._model.embed(texts))
            normalized = []
            for vec in raw_embeddings:
                norm = np.linalg.norm(vec)
                if norm > 0:
                    normalized.append(vec / norm)
                else:
                    normalized.append(vec)
            return normalized
        except Exception as e:
            logger.error(f"Error during FastEmbed inference ({e}). Falling back to mock vectors.")
            return [self._generate_mock_vector(t) for t in texts]

    def embed_single(self, text: str) -> np.ndarray:
        """Generates embedding vector for a single string."""
        results = self.embed([text])
        return results[0] if results else np.zeros(384, dtype=np.float32)

    @staticmethod
    def cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
        """
        Computes cosine similarity between two vectors.
        Assumes normalized vectors or applies safe dot-product / norm calculation.
        """
        norm_a = np.linalg.norm(vec_a)
        norm_b = np.linalg.norm(vec_b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        sim = float(np.dot(vec_a, vec_b) / (norm_a * norm_b))
        # Clamp to [-1.0, 1.0] to guard against floating-point noise
        return max(-1.0, min(1.0, sim))


# Convenience accessor
def get_embedding_service() -> FastEmbedSingleton:
    return FastEmbedSingleton()
