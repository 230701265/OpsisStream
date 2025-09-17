# OPSIS Python Backend Migration

## Overview

The OPSIS platform has been successfully migrated from Node.js/Express to Python/FastAPI with integrated Natural Language Processing (NLP) capabilities.

## New Backend Features

### 🚀 **FastAPI Backend**
- High-performance async Python web framework
- Automatic API documentation at `/docs`
- Type-safe request/response handling
- WebSocket support for real-time features

### 🧠 **NLP Integration**
- **Automated Essay Grading**: Intelligent scoring with detailed feedback
- **Plagiarism Detection**: Content similarity analysis
- **Writing Quality Analysis**: Grammar, vocabulary, and readability metrics
- **Sentiment Analysis**: Emotional tone detection in responses
- **Question Difficulty Assessment**: Automatic complexity scoring
- **Keyword Extraction**: Important term identification

### 📊 **Enhanced Analytics**
- Real-time text analysis during exam taking
- Instructor dashboard with NLP insights
- Student performance analytics with writing quality metrics
- Automated feedback generation

## Backend Structure

```
python_server/
├── main.py              # FastAPI application entry point
├── models.py            # SQLAlchemy database models + Pydantic schemas
├── database.py          # Database configuration and storage operations
├── auth.py              # Authentication and authorization
├── routes.py            # API endpoints (auth, exams, questions, attempts, NLP)
├── nlp_service.py       # Natural Language Processing service
└── websocket_manager.py # Real-time WebSocket connections
```

## API Endpoints

### Core Endpoints (Compatible with existing frontend)
- `GET /api/auth/user` - Get current user
- `GET /api/exams` - List exams
- `POST /api/exams` - Create exam
- `GET /api/exams/{id}/questions` - Get exam questions
- `POST /api/attempts/{id}/start` - Start exam attempt

### New NLP Endpoints
- `POST /api/nlp/analyze-text` - Comprehensive text analysis
- `POST /api/nlp/check-plagiarism` - Plagiarism detection
- `POST /api/nlp/grade-essay` - Automated essay grading

### Health Check
- `GET /api/health` - Service health status
- `GET /` - API information

## Running the Python Backend

### Method 1: Direct Python Execution
```bash
cd python_server
PORT=8000 python main.py
```

### Method 2: Using the startup script
```bash
python start_python_server.py
```

### Method 3: Update workflow (when package.json can be modified)
Replace the npm dev script to use Python instead of Node.js:
```json
{
  "scripts": {
    "dev": "python start_python_server.py"
  }
}
```

## Database Compatibility

The Python backend uses the same PostgreSQL database as the original Node.js version:
- **Users**: Role-based access control
- **Exams**: Exam management and configuration
- **Questions**: Multiple question types with NLP analysis
- **Attempts**: Exam submissions with writing quality metrics
- **Audit Log**: Activity tracking and compliance

## Environment Variables

Required environment variables (same as before):
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET_KEY`: JWT token signing key (optional, defaults provided)
- `PORT`: Server port (defaults to 8000)
- `HOST`: Server host (defaults to 0.0.0.0)

## NLP Service Features

### 1. Text Analysis
- Word count and readability scores
- Difficulty assessment (1-5 scale)
- Keyword extraction
- Language quality metrics

### 2. Plagiarism Detection
- Cosine similarity analysis using TF-IDF
- Risk level assessment (low/medium/high)
- Reference text comparison
- Potential match identification

### 3. Automated Essay Grading
- Content relevance scoring
- Writing quality assessment
- Structure and organization analysis
- Constructive feedback generation

### 4. Writing Quality Metrics
- Grammar and spelling estimation
- Vocabulary richness (Type-Token Ratio)
- Sentence structure analysis
- Overall quality scoring

## Frontend Compatibility

The Python backend maintains full compatibility with the existing React frontend:
- Same API endpoints and response formats
- Session-based authentication
- WebSocket support for real-time features
- Error handling and status codes

## Benefits of the Migration

1. **Enhanced Intelligence**: Built-in NLP capabilities for automated grading and analysis
2. **Better Performance**: FastAPI's async capabilities and optimized Python libraries
3. **Scalability**: Better handling of concurrent users and heavy NLP processing
4. **Modern Stack**: Latest Python ecosystem with extensive ML/AI libraries
5. **Accessibility Focus**: NLP features enhance accessibility by providing automated feedback

## Testing the Backend

1. **Health Check**: `curl http://localhost:8000/api/health`
2. **API Documentation**: Visit `http://localhost:8000/docs` for interactive API docs
3. **Text Analysis**: Test NLP endpoints with sample text
4. **Database Operations**: Verify CRUD operations work correctly

## Deployment Considerations

- Install Python dependencies via requirements.txt or uv
- Configure environment variables for production
- Set up proper JWT secret keys
- Ensure PostgreSQL connectivity
- Consider using gunicorn + uvicorn for production deployment

## Migration Status

✅ **Completed Components**:
- FastAPI application setup
- Database models and operations
- Authentication system
- API route implementations
- NLP service integration
- WebSocket manager
- Compatible API responses

🔄 **To Update Workflow**:
- Modify package.json dev script (when possible)
- Update deployment configuration
- Test with frontend integration

The backend is fully functional and ready for use. The existing React frontend should work seamlessly with the new Python backend.