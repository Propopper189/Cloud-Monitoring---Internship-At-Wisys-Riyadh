# Chapter 8: Technical Implementation

## 8.1 Backend Implementation Details
- **Python 3 / FastAPI**: Used for high-performance asynchronous REST API routing.
- **SQLAlchemy & SQLite**: Implemented as the local ORM and database. Database tables initialize and seed automatically on startup.
- **Pydantic**: Provides data validation.

## 8.2 Service Layer Modules
- `adapters.py`: Normalizes vendor logs.
- `rule_engine.py`: Matches incoming event types to rules database and manages resource state triggers.
- `security_score.py`: Deducts points based on open events, applying a mitigation discount (50% recovery) when alerts are acknowledged.
- `alert_service.py`: Transitions alert status states.

## 8.3 Frontend Implementation
- **React + Vite**: Setup for fast frontend bundling.
- **TypeScript**: Ensures type safety across models.
- **CSS3 Design System**: Custom responsive layout with CSS variables for dark/light themes.
