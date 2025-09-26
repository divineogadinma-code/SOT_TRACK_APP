const mongoose = require('mongoose');

// This schema will store all the configurable values for your point system.
const pointSettingSchema = new mongoose.Schema({
    // Unique key to ensure we only ever have one settings document
    key: {
        type: String,
        default: 'main_settings',
        unique: true
    },
    conversionRate: {
        type: Number,
        default: 7 // 1 point = 7 Naira
    },
    dailyMaxPoints: {
        type: Number,
        default: 200
    },
    monthlyMaxPoints: {
        type: Number,
        default: 6200
    },
    // Points for standard daily tasks
    feedingRoutinePoints: {
        type: Number,
        default: 40
    },
    maintenancePoints: {
        type: Number,
        default: 30
    },
    healthCheckPoints: {
        type: Number,
        default: 60
    },
    eggCollectionMaxPoints: {
        type: Number,
        default: 70
    },
    // Points for bonuses
    perfectAttendanceBonus: {
        type: Number,
        default: 400
    },
    innovationBonus: {
        type: Number,
        default: 400
    }
});

module.exports = mongoose.model('PointSetting', pointSettingSchema);
