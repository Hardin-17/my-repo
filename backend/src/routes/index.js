const express = require('express');
const router = express.Router();
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const objectRoutes = require('./objectRoutes');
const nodeRoutes = require('./nodeRoutes');
const metricsRoutes = require('./metricsRoutes');
const chaosRoutes = require('./chaosRoutes');
const integrityRoutes = require('./integrityRoutes');
const recoveryRoutes = require('./recoveryRoutes');

// Mount routes
router.use('/', healthRoutes); // Provides /api/health
router.use('/auth', authRoutes); // Provides /api/auth/*
router.use('/objects', objectRoutes); // Provides /api/objects/*
router.use('/nodes', nodeRoutes); // Provides /api/nodes/*
router.use('/metrics', metricsRoutes); // Provides /api/metrics
router.use('/chaos', chaosRoutes); // Provides /api/chaos/*
router.use('/integrity', integrityRoutes); // Provides /api/integrity/*
router.use('/recovery', recoveryRoutes); // Provides /api/recovery/*
router.use('/repair', recoveryRoutes); // Provides /api/repair/*

module.exports = router;
