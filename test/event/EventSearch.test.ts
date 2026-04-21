import request from 'supertest';
import { createComposedApp } from '../../src/composition'; // Assuming your app is exported from src/app.ts
import { CreateLoggingService } from '../../src/service/LoggingService';

describe('EventSearch API', () => {

    describe('GET /events/search', () => {
        let agent: any;
        let app: any;
        beforeAll(async () => {
            app = createComposedApp(CreateLoggingService()).getExpressApp();
            agent = request.agent(app);
            const loginRes = await agent.post('/login').send({ username: 'user@app.test', password: 'password123' });
            // Debug: Ensure login actually worked
            if (loginRes.status !== 200 && loginRes.status !== 302) {
              console.error('Login failed with status:', loginRes.status);
            }
        });

        it('should return all events on events page', async () => {
            const response = await agent.get("/events");
            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBeGreaterThan(0);
        });

        it('should return no results for a query with no matches', async () => {
            const response = await agent
                .get('/events/search')
                .query({ q: 'nonexistentevent' });

            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBe(0);
        });

        it('should handle empty queries gracefully', async () => {
            const app = createComposedApp(CreateLoggingService()).getExpressApp();
            const response = await request(app as any)
                .get('/events/search')
                .query({ q: '' });

            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
            // Depending on implementation, might return all events or empty
        });

        it('should return 400 for invalid input (non-string query)', async () => {
            const app = createComposedApp(CreateLoggingService()).getExpressApp();
            const response = await request(app as any)
                .get('/events/search')
                .query({ q: 123 }); // Invalid input

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
    });
});
