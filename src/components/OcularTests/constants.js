
export const OCULAR_TESTS = {
    FIX: {
        id: 'fix',
        title: 'Fixation Stability',
        label: 'Fixation (FIX)',
        desc: 'Baseline Test. Keep your eyes locked on the center dot for 15 seconds without blinking if possible.',
        demo: 'Simply stare at the center dot. Keep your head and eyes as still as possible.'
    },
    MGST: {
        id: 'mgst',
        title: 'Memory Guided Saccades',
        label: 'Memory Guided Saccades (MGST)',
        desc: 'Working Memory Test. A green dot appears peripherally, moves to center, then disappears. Look back at the original peripheral location.',
        demo: '1. Green dot appears (Look at it). 2. Moves to center (Look at it). 3. Disappears (Look back to where it started!).'
    },
    AST: {
        id: 'ast',
        title: 'Antisaccades',
        label: 'Antisaccades (AST)',
        desc: 'Inhibitory Control Test. When a red dot appears on one side, immediately look to the OPPOSITE side.',
        demo: 'If the dot appears on the LEFT, look RIGHT. If it appears on the RIGHT, look LEFT. Do not look at the dot.'
    },
    SPT: {
        id: 'spt',
        title: 'Linear Smooth Pursuit',
        label: 'Smooth Pursuit (SPT)',
        desc: 'Tracking Test. Follow the dot as it moves smoothly back and forth across the screen.',
        demo: 'Keep your eyes locked on the dot. It moves at a constant speed. Do not jump ahead.'
    },
    VGST: {
        id: 'vgst',
        title: 'Visually Guided Saccades',
        label: 'Visually Guided Saccades (VGST)',
        desc: 'Standard reflex test. Follow the randomly jumping target as quickly as possible.',
        demo: 'Simply look at the dot wherever it appears.'
    }
};

export const TEST_CONFIG = {
    FIX: {
        id: 'fix',
        duration: 15000,
        targetSize: 15,
        type: 'fixation'
    },
    MGST: {
        id: 'mgst',
        duration: 60000, // Increased to 60s as per clinical protocol
        targetSize: 20,
        phases: {
            peripheral: 1500,
            center: 1500,
            response: 1500
        },
        type: 'memory_sequence'
    },
    AST: {
        id: 'ast',
        duration: 45000, // Increased to 45s
        targetSize: 20,
        jumpInterval: 2500,
        type: 'antisaccade'
    },
    SPT: {
        id: 'spt',
        duration: 40000,
        targetSize: 20,
        lapTime: 10000, // Slightly slower for better gain tracking on mobile
        type: 'smooth_linear'
    },
    VGST: {
        id: 'vgst',
        duration: 30000,
        targetSize: 20,
        jumpInterval: 1200,
        type: 'jump'
    }
};

export const CLINICAL_THRESHOLDS = {
    MGST: {
        accuracy: 75, // %
        latency: 450, // ms
    },
    AST: {
        errorRate: 0.30, // 30%
    },
    SPT: {
        gain: 0.8,
        rmse: 15,
    },
    VGST: {
        latency: 250, // ms
        peakVelocityScale: 0.1, // Normalized
    }
};

export const OCULAR_TRANSLATIONS = {
    en: {
        ocular_tests_title: "Ocular Motor Tests",
        ocular_tests_subtitle: "Clinical MHE Detection Protocol",
        start_demo: "Watch Demo",
        start_test: "Start Test",
        instruction: "Protocol Instruction",
        back_menu: "Back to Menu",
        ...Object.values(OCULAR_TESTS).reduce((acc, test) => {
            acc[`${test.id}_title`] = test.title;
            acc[`${test.id}_desc`] = test.desc;
            acc[`${test.id}_demo`] = test.demo;
            return acc;
        }, {})
    }
    // Hindi and Marathi usually derived from English keys in this repo's pattern
};
