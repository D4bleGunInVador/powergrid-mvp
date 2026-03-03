# PowerGrid MVP Prototype

## Run backend
cd backend
uvicorn main:app --reload --port 8000

## Run desktop (Electron + Vite)
cd desktop
npm install
npm run dev

## Run tests
cd backend
pytest -q