"""
Natural Language Processing Service
Provides NLP functionality for exam analysis and automated grading
"""
import re
import string
import math
from typing import Dict, List, Any, Optional, Tuple
from collections import Counter
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
import textstat
import logging

logger = logging.getLogger(__name__)

# Initialize NLTK components
try:
    nltk.download('punkt', quiet=True)
    nltk.download('vader_lexicon', quiet=True)
    nltk.download('stopwords', quiet=True)
    nltk.download('wordnet', quiet=True)
    
    sia = SentimentIntensityAnalyzer()
    lemmatizer = WordNetLemmatizer()
    stop_words = set(stopwords.words('english'))
    
    logger.info("NLTK components initialized successfully")
except Exception as e:
    logger.warning(f"NLTK initialization error: {e}")
    # Fallback to basic functionality
    sia = None
    lemmatizer = None
    stop_words = set()

class NLPService:
    """Natural Language Processing service for exam analysis"""
    
    def __init__(self):
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2)
        )
        # Store reference texts for plagiarism detection
        self.reference_corpus = []
    
    def clean_text(self, text: str) -> str:
        """Clean and preprocess text"""
        if not text:
            return ""
        
        # Convert to lowercase
        text = text.lower()
        
        # Remove special characters but keep spaces
        text = re.sub(r'[^\w\s]', ' ', text)
        
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        return text
    
    def extract_keywords(self, text: str, max_keywords: int = 10) -> List[str]:
        """Extract important keywords from text"""
        if not text:
            return []
        
        try:
            # Clean text
            clean_text = self.clean_text(text)
            
            # Tokenize
            tokens = word_tokenize(clean_text) if word_tokenize else clean_text.split()
            
            # Remove stop words and short words
            keywords = [
                word for word in tokens 
                if word not in stop_words and len(word) > 2
            ]
            
            # Count frequency and get top keywords
            word_freq = Counter(keywords)
            return [word for word, _ in word_freq.most_common(max_keywords)]
            
        except Exception as e:
            logger.error(f"Keyword extraction error: {e}")
            # Fallback to simple word frequency
            words = text.lower().split()
            return list(set(words))[:max_keywords]
    
    def calculate_readability(self, text: str) -> Dict[str, float]:
        """Calculate text readability scores"""
        if not text:
            return {"flesch_score": 0, "grade_level": 0}
        
        try:
            flesch_score = textstat.flesch_reading_ease(text)
            grade_level = textstat.flesch_kincaid_grade(text)
            
            return {
                "flesch_score": flesch_score,
                "grade_level": grade_level,
                "avg_sentence_length": textstat.avg_sentence_length(text),
                "avg_syllables_per_word": textstat.avg_syllables_per_word(text)
            }
        except Exception as e:
            logger.error(f"Readability calculation error: {e}")
            # Fallback calculation
            words = len(text.split())
            sentences = len(text.split('.'))
            return {
                "flesch_score": max(0, 100 - (words / max(sentences, 1))),
                "grade_level": max(1, words / max(sentences, 1) / 5)
            }
    
    def calculate_difficulty_score(self, question_text: str) -> float:
        """Calculate question difficulty based on text complexity"""
        if not question_text:
            return 1.0
        
        try:
            readability = self.calculate_readability(question_text)
            word_count = len(question_text.split())
            
            # Difficulty factors
            grade_level_factor = min(readability["grade_level"] / 12, 1.0)  # Normalize to 0-1
            length_factor = min(word_count / 100, 1.0)  # Normalize to 0-1
            complexity_words = len([w for w in question_text.split() if len(w) > 7]) / max(word_count, 1)
            
            # Combine factors (0-5 scale)
            difficulty = (grade_level_factor * 2 + length_factor + complexity_words * 2)
            return min(max(difficulty, 1.0), 5.0)
            
        except Exception as e:
            logger.error(f"Difficulty calculation error: {e}")
            return 2.5  # Default medium difficulty
    
    def analyze_sentiment(self, text: str) -> Dict[str, float]:
        """Analyze sentiment of text"""
        if not text or not sia:
            return {"positive": 0, "neutral": 1, "negative": 0, "compound": 0}
        
        try:
            scores = sia.polarity_scores(text)
            return {
                "positive": scores["pos"],
                "neutral": scores["neu"],
                "negative": scores["neg"],
                "compound": scores["compound"]
            }
        except Exception as e:
            logger.error(f"Sentiment analysis error: {e}")
            return {"positive": 0, "neutral": 1, "negative": 0, "compound": 0}
    
    def check_plagiarism(self, text: str, reference_texts: List[str] = None) -> Dict[str, Any]:
        """Check for potential plagiarism"""
        if not text:
            return {"similarity_score": 0, "matches": [], "risk_level": "low"}
        
        try:
            # Use provided references or stored corpus
            references = reference_texts or self.reference_corpus
            
            if not references:
                return {"similarity_score": 0, "matches": [], "risk_level": "low"}
            
            # Combine text with references
            all_texts = [text] + references
            
            # Calculate TF-IDF similarity
            tfidf_matrix = self.tfidf_vectorizer.fit_transform(all_texts)
            similarity_matrix = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])
            
            # Find highest similarity
            max_similarity = float(np.max(similarity_matrix)) if similarity_matrix.size > 0 else 0
            
            # Determine risk level
            if max_similarity > 0.8:
                risk_level = "high"
            elif max_similarity > 0.5:
                risk_level = "medium"
            else:
                risk_level = "low"
            
            # Find potential matches
            matches = []
            for i, similarity in enumerate(similarity_matrix[0]):
                if similarity > 0.3:  # Threshold for reporting matches
                    matches.append({
                        "reference_index": i,
                        "similarity": float(similarity),
                        "snippet": references[i][:100] + "..." if len(references[i]) > 100 else references[i]
                    })
            
            return {
                "similarity_score": max_similarity,
                "matches": matches,
                "risk_level": risk_level
            }
            
        except Exception as e:
            logger.error(f"Plagiarism check error: {e}")
            return {"similarity_score": 0, "matches": [], "risk_level": "low"}
    
    def analyze_writing_quality(self, text: str) -> Dict[str, Any]:
        """Analyze writing quality metrics"""
        if not text:
            return self._default_writing_quality()
        
        try:
            # Basic metrics
            word_count = len(text.split())
            sentence_count = len(sent_tokenize(text)) if sent_tokenize else len(text.split('.'))
            paragraph_count = len([p for p in text.split('\n\n') if p.strip()])
            
            # Calculate averages
            avg_words_per_sentence = word_count / max(sentence_count, 1)
            avg_sentences_per_paragraph = sentence_count / max(paragraph_count, 1)
            
            # Vocabulary richness (Type-Token Ratio)
            words = self.clean_text(text).split()
            unique_words = set(words)
            vocabulary_richness = len(unique_words) / max(len(words), 1)
            
            # Grammar/spelling (simple heuristic)
            spelling_errors = self._estimate_spelling_errors(text)
            grammar_score = max(0, 1 - (spelling_errors / max(word_count, 1)))
            
            # Readability
            readability = self.calculate_readability(text)
            
            # Overall quality score (0-1)
            quality_factors = [
                min(vocabulary_richness * 2, 1),  # Vocabulary diversity
                min(grammar_score, 1),  # Grammar quality
                min((readability["flesch_score"] / 100), 1) if readability["flesch_score"] > 0 else 0.5,  # Readability
                min(avg_words_per_sentence / 20, 1) if avg_words_per_sentence < 30 else 0.5  # Sentence structure
            ]
            
            overall_quality = sum(quality_factors) / len(quality_factors)
            
            return {
                "word_count": word_count,
                "sentence_count": sentence_count,
                "paragraph_count": paragraph_count,
                "avg_words_per_sentence": round(avg_words_per_sentence, 2),
                "avg_sentences_per_paragraph": round(avg_sentences_per_paragraph, 2),
                "vocabulary_richness": round(vocabulary_richness, 3),
                "estimated_spelling_errors": spelling_errors,
                "grammar_score": round(grammar_score, 3),
                "readability": readability,
                "overall_quality_score": round(overall_quality, 3)
            }
            
        except Exception as e:
            logger.error(f"Writing quality analysis error: {e}")
            return self._default_writing_quality()
    
    def _default_writing_quality(self) -> Dict[str, Any]:
        """Return default writing quality metrics"""
        return {
            "word_count": 0,
            "sentence_count": 0,
            "paragraph_count": 0,
            "avg_words_per_sentence": 0,
            "avg_sentences_per_paragraph": 0,
            "vocabulary_richness": 0,
            "estimated_spelling_errors": 0,
            "grammar_score": 0,
            "readability": {"flesch_score": 0, "grade_level": 0},
            "overall_quality_score": 0
        }
    
    def _estimate_spelling_errors(self, text: str) -> int:
        """Estimate spelling errors (simple heuristic)"""
        # This is a very basic estimation
        # In production, you'd use a proper spell checker
        words = text.split()
        potential_errors = 0
        
        for word in words:
            # Remove punctuation
            clean_word = word.strip(string.punctuation)
            
            # Very basic checks
            if len(clean_word) > 2:
                # Check for repeated characters (basic pattern)
                if re.search(r'(.)\1{2,}', clean_word):
                    potential_errors += 1
                # Check for mixed case (basic pattern)
                elif re.search(r'[a-z][A-Z]', clean_word):
                    potential_errors += 1
        
        return potential_errors
    
    def grade_essay_automated(self, 
                            essay_text: str, 
                            question_text: str, 
                            max_score: float = 10.0,
                            rubric: Dict[str, Any] = None) -> Dict[str, Any]:
        """Provide automated essay grading with feedback"""
        if not essay_text:
            return self._default_essay_grade(max_score)
        
        try:
            # Analyze writing quality
            quality = self.analyze_writing_quality(essay_text)
            
            # Analyze sentiment (for engagement detection)
            sentiment = self.analyze_sentiment(essay_text)
            
            # Calculate content relevance (simple keyword matching)
            question_keywords = self.extract_keywords(question_text)
            essay_keywords = self.extract_keywords(essay_text)
            keyword_overlap = len(set(question_keywords) & set(essay_keywords))
            relevance_score = keyword_overlap / max(len(question_keywords), 1)
            
            # Scoring factors
            length_score = min(quality["word_count"] / 200, 1.0)  # Optimal around 200 words
            quality_score = quality["overall_quality_score"]
            relevance_score = min(relevance_score, 1.0)
            structure_score = min(quality["paragraph_count"] / 3, 1.0)  # Good essays have 3+ paragraphs
            
            # Calculate weighted score
            weights = {
                "content_relevance": 0.35,
                "writing_quality": 0.30,
                "length_appropriateness": 0.20,
                "structure": 0.15
            }
            
            final_score = (
                relevance_score * weights["content_relevance"] +
                quality_score * weights["writing_quality"] +
                length_score * weights["length_appropriateness"] +
                structure_score * weights["structure"]
            ) * max_score
            
            # Generate feedback
            strengths = []
            improvements = []
            
            if quality_score > 0.7:
                strengths.append("Good writing quality and vocabulary usage")
            elif quality_score < 0.4:
                improvements.append("Focus on improving grammar and vocabulary")
            
            if relevance_score > 0.5:
                strengths.append("Good content relevance to the question")
            else:
                improvements.append("Address the question more directly")
            
            if quality["word_count"] >= 150:
                strengths.append("Adequate length and detail")
            else:
                improvements.append("Provide more detailed explanation")
            
            if quality["paragraph_count"] >= 3:
                strengths.append("Well-structured with multiple paragraphs")
            else:
                improvements.append("Organize content into clear paragraphs")
            
            return {
                "suggested_score": round(final_score, 2),
                "max_score": max_score,
                "percentage": round((final_score / max_score) * 100, 1),
                "feedback": {
                    "content_relevance": round(relevance_score, 2),
                    "writing_quality": round(quality_score, 2),
                    "length_score": round(length_score, 2),
                    "structure_score": round(structure_score, 2)
                },
                "strengths": strengths,
                "areas_for_improvement": improvements,
                "writing_quality": quality,
                "sentiment": sentiment
            }
            
        except Exception as e:
            logger.error(f"Essay grading error: {e}")
            return self._default_essay_grade(max_score)
    
    def _default_essay_grade(self, max_score: float) -> Dict[str, Any]:
        """Return default essay grade"""
        return {
            "suggested_score": 0.0,
            "max_score": max_score,
            "percentage": 0.0,
            "feedback": {},
            "strengths": [],
            "areas_for_improvement": ["Please provide an answer"],
            "writing_quality": self._default_writing_quality(),
            "sentiment": {"positive": 0, "neutral": 1, "negative": 0, "compound": 0}
        }
    
    def add_reference_text(self, text: str):
        """Add text to reference corpus for plagiarism detection"""
        if text and text not in self.reference_corpus:
            self.reference_corpus.append(text)
    
    def analyze_question_text(self, question_text: str) -> Dict[str, Any]:
        """Comprehensive question analysis"""
        return {
            "keywords": self.extract_keywords(question_text),
            "difficulty_score": self.calculate_difficulty_score(question_text),
            "readability": self.calculate_readability(question_text),
            "word_count": len(question_text.split()),
            "estimated_time_minutes": max(1, len(question_text.split()) / 50)  # ~50 words per minute reading
        }

# Global NLP service instance
nlp_service = NLPService()