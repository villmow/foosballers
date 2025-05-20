import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { MatchModel } from '../models/Match';
import { createMatch, deleteMatch, getMatch, updateMatch } from './matchController';

jest.mock('../middleware/authMiddleware', () => ({
  authMiddleware: (_req: any, _res: any, next: any) => next(),
  requireAuth: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../models/Match');

const app = express();
app.use(express.json());
app.use(cookieParser());
function asyncHandler(fn: any) {
  return function (req: express.Request, res: express.Response, next: express.NextFunction) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

app.post('/api/matches', asyncHandler(createMatch));
app.get('/api/matches/:id', asyncHandler(getMatch));
app.put('/api/matches/:id', asyncHandler(updateMatch));
app.delete('/api/matches/:id', asyncHandler(deleteMatch));

describe('Match API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a match', async () => {
    (MatchModel as any).mockImplementation(() => ({ save: jest.fn().mockResolvedValue(true) }));
    const res = await request(app)
      .post('/api/matches')
      .send({ name: 'Test Match' });
    expect(res.statusCode).toBe(201);
  });

  it('should get a match by id', async () => {
    (MatchModel.findById as any) = jest.fn().mockResolvedValue({ _id: '1', name: 'Test Match' });
    const res = await request(app).get('/api/matches/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Test Match');
  });

  it('should update a match by id', async () => {
    (MatchModel.findByIdAndUpdate as any) = jest.fn().mockResolvedValue({ _id: '1', name: 'Updated Match' });
    const res = await request(app).put('/api/matches/1').send({ name: 'Updated Match' });
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Updated Match');
  });

  it('should delete a match by id', async () => {
    (MatchModel.findByIdAndDelete as any) = jest.fn().mockResolvedValue({ _id: '1', name: 'Test Match' });
    const res = await request(app).delete('/api/matches/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Match deleted');
  });

  it('should return 404 if match not found (get)', async () => {
    (MatchModel.findById as any) = jest.fn().mockResolvedValue(null);
    const res = await request(app).get('/api/matches/404');
    expect(res.statusCode).toBe(404);
  });

  it('should return 404 if match not found (update)', async () => {
    (MatchModel.findByIdAndUpdate as any) = jest.fn().mockResolvedValue(null);
    const res = await request(app).put('/api/matches/404').send({ name: 'No Match' });
    expect(res.statusCode).toBe(404);
  });

  it('should return 404 if match not found (delete)', async () => {
    (MatchModel.findByIdAndDelete as any) = jest.fn().mockResolvedValue(null);
    const res = await request(app).delete('/api/matches/404');
    expect(res.statusCode).toBe(404);
  });
});
