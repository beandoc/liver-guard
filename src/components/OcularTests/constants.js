
export const OCULAR_TESTS = {
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
        desc: 'Inhibitory Control Test. When a green dot appears on one side, immediately look to the OPPOSITE side.',
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
    MGST: {
        id: 'mgst',
        duration: 45000,
        targetSize: 20,
        phases: {
            peripheral: 1500,
            center: 1500,
            response: 1500
        },
        reps: { vertical: 12, horizontal: 22 },
        type: 'memory_sequence' // Logic: Peripheral -> Center -> Blank
    },
    AST: {
        id: 'ast',
        duration: 30000,
        targetSize: 20,
        jumpInterval: 2500, // Time to respond
        type: 'antisaccade'
    },
    SPT: {
        id: 'spt',
        duration: 32000, // 4 laps of 8s
        targetSize: 20,
        lapTime: 8000, // 8 seconds per full lap (left->right->left)
        type: 'smooth_linear' // Linear velocity, not sinusoidal
    },
    VGST: {
        id: 'vgst',
        duration: 30000,
        targetSize: 20,
        jumpInterval: 1200,
        type: 'jump'
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
    },
    hi: {
        ocular_tests_title: "नेत्र गति परीक्षण",
        ocular_tests_subtitle: "नैदानिक MHE प्रोटोकॉल",
        start_demo: "डेमो देखें",
        start_test: "परीक्षण शुरू करें",
        instruction: "निर्देश",
        back_menu: "मेनू पर वापस",
        ...Object.values(OCULAR_TESTS).reduce((acc, test) => {
            acc[`${test.id}_title`] = test.title;
            acc[`${test.id}_desc`] = test.desc;
            acc[`${test.id}_demo`] = test.demo;
            return acc;
        }, {})
    },
    mr: {
        ocular_tests_title: "नेत्र हालचाल चाचण्या",
        ocular_tests_subtitle: "क्लिनिकल MHE प्रोटोकॉल",
        start_demo: "डेमो पहा",
        start_test: "चाचणी सुरू करा",
        instruction: "सूचना",
        back_menu: "मेनूवर परत",
        ...Object.values(OCULAR_TESTS).reduce((acc, test) => {
            acc[`${test.id}_title`] = test.title;
            acc[`${test.id}_desc`] = test.desc;
            acc[`${test.id}_demo`] = test.demo;
            return acc;
        }, {})
    }
};
