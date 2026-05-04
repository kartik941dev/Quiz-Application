const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../server');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Backend Full Health & Credibility Tests', () => {
  let teacherToken;
  let studentToken;
  let quizId;
  let joinCode;

  // 1. AUTH TESTS
  describe('Auth Endpoints', () => {
    it('should register and login a teacher', async () => {
      await request(app).post('/api/auth/register').send({
        name: 'Teacher', email: 't@t.com', password: 'password', role: 'teacher'
      });
      const res = await request(app).post('/api/auth/login').send({
        email: 't@t.com', password: 'password'
      });
      teacherToken = res.body.token;
      expect(teacherToken).toBeDefined();
    });

    it('should register and login a student', async () => {
      await request(app).post('/api/auth/register').send({
        name: 'Student', email: 's@s.com', password: 'password', role: 'student'
      });
      const res = await request(app).post('/api/auth/login').send({
        email: 's@s.com', password: 'password'
      });
      studentToken = res.body.token;
      expect(studentToken).toBeDefined();
    });
  });

  // 2. QUIZ LIFECYCLE & CREDIBILITY
  describe('Quiz Endpoints', () => {
    it('should create a quiz (Teacher)', async () => {
      const res = await request(app)
        .post('/api/quiz')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Science Quiz',
          questions: [{ text: 'Water formula?', options: ['H2O', 'CO2'], correctOptionIndex: 0, timeLimit: 10 }]
        });
      quizId = res.body.quiz._id;
      joinCode = res.body.quiz.joinCode;
      expect(res.statusCode).toBe(201);
    });

    it('should join and submit quiz with correct scoring (Student)', async () => {
      // Join
      await request(app)
        .post('/api/quiz/join')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ joinCode });

      // Get quiz to get question ID
      const quizRes = await request(app)
        .get(`/api/quiz/${quizId}`)
        .set('Authorization', `Bearer ${studentToken}`);
      const qId = quizRes.body.quiz.questions[0]._id;

      // Submit
      const subRes = await request(app)
        .post(`/api/quiz/${quizId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ answers: [{ questionId: qId, selectedOptionIndex: 0 }] });
      
      expect(subRes.statusCode).toBe(200);

      // Verify Results
      const resRes = await request(app)
        .get(`/api/quiz/${quizId}/results`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(resRes.body.score).toBe(1);
    });
  });

  // 3. DOUBTS, ANALYTICS, EXPORT, STUDENT STATS
  describe('Advanced Features', () => {
    it('should handle doubts (Student post, Teacher get)', async () => {
      // Student post
      await request(app)
        .post('/api/doubts')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ quizId, questionIndex: 0, doubtText: 'Help!' });

      // Teacher get
      const res = await request(app)
        .get(`/api/doubts/${quizId}`)
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.doubts.length).toBeGreaterThan(0);
    });

    it('should fetch analytics (Teacher)', async () => {
      const res = await request(app)
        .get(`/api/analytics/${quizId}`)
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should export data in CSV and PDF (Teacher)', async () => {
      const csvRes = await request(app)
        .get(`/api/export/${quizId}/csv`)
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(csvRes.statusCode).toBe(200);
      expect(csvRes.header['content-type']).toBe('text/csv; charset=utf-8');

      const pdfRes = await request(app)
        .get(`/api/export/${quizId}/pdf`)
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(pdfRes.statusCode).toBe(200);
      expect(pdfRes.header['content-type']).toBe('application/pdf');
    });

    it('should fetch student dashboard stats (Student)', async () => {
      const res = await request(app)
        .get('/api/student/dashboard-stats')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.stats.totalQuizzes).toBe(1);
    });
  });

  // 4. BEHAVIORAL & SECURITY
  describe('Security & Behavior', () => {
    it('should block students from teacher routes (RBAC)', async () => {
      const res = await request(app)
        .get('/api/quiz/my-quizzes')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.statusCode).toBe(403);
    });

    it('should block unauthorized export attempts', async () => {
      // Another teacher trying to export this quiz
      await request(app).post('/api/auth/register').send({
        name: 'Spy', email: 'spy@t.com', password: 'password', role: 'teacher'
      });
      const spyRes = await request(app).post('/api/auth/login').send({
        email: 'spy@t.com', password: 'password'
      });
      const spyToken = spyRes.body.token;

      const res = await request(app)
        .get(`/api/export/${quizId}/csv`)
        .set('Authorization', `Bearer ${spyToken}`);
      expect(res.statusCode).toBe(403);
    });
  });
});
