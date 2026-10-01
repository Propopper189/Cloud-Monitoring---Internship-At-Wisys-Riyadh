# Chapter 11: Technical Challenges

## 11.1 Normalizing Divergent Log Schemas
GCP structures payloads within a nested `protoPayload` object, whereas Huawei CTS logs flatten attributes. Creating the `CloudProviderAdapter` abstract layer was crucial to resolve this structural difference cleanly.

## 11.2 Thread Safety and Background Tasks
Running the periodic simulator thread in parallel with the FastAPI ASGI loop requires isolating the database sessions. We solved this by using separate database connections (`SessionLocal`) inside the thread.

## 11.3 UI Responsive Layouts without Tailwind
To comply with standard CSS guidelines and ensure visual control, we wrote custom CSS variables and responsive media queries, avoiding bloated CSS libraries.
