
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
        duration: 48000,
        targetSize: 22,
        gapDuration: 200,        // ms fixation-OFF before cue
        cueDuration: 1000,       // ms cue visible
        itiDuration: 1000,       // ms inter-trial blank
        targetEccentricity: 25,  // % from center
        type: 'antisaccade_gap'
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
    },
    // Hindi and Marathi usually derived from English keys in this repo's pattern
    hi: {
        ocular_tests_title: "ओक्यूलर मोटर परीक्षण",
        ocular_tests_subtitle: "नैदानिक MHE जांच प्रोटोकॉल",
        start_demo: "डेमो देखें",
        start_test: "परीक्षण शुरू करें",
        instruction: "प्रोटोकॉल निर्देश",
        back_menu: "मेन्यू पर वापस जाएं",
        fix_title: 'फिक्सेशन स्थिरता',
        fix_desc: 'आधारभूत परीक्षण। यदि संभव हो तो बिना पलक झपकाए 15 सेकंड के लिए केंद्र बिंदु पर अपनी निगाहें जमाए रखें।',
        fix_demo: 'बस केंद्र बिंदु को घूरें। अपने सिर और आंखों को जितना हो सके स्थिर रखें।',
        mgst_title: 'मेमोरी गाइडेड सैकेड्स',
        mgst_desc: 'वर्किंग मेमोरी टेस्ट। एक हरा बिंदु परिधि में दिखाई देता है, केंद्र में जाता है, फिर गायब हो जाता है। मूल परिधीय स्थान पर वापस देखें।',
        mgst_demo: '1. हरा बिंदु दिखाई देता है (उसे देखें)। 2. केंद्र की ओर जाता है (उसे देखें)। 3. गायब हो जाता है (वहां वापस देखें जहां से यह शुरू हुआ था!)।',
        ast_title: 'एंटी-सैकेड्स',
        ast_desc: 'निषेध नियंत्रण परीक्षण। जब एक लाल बिंदु एक तरफ दिखाई देता है, तो तुरंत विपरीत दिशा में देखें।',
        ast_demo: 'यदि बिंदु बाईं ओर दिखाई देता है, तो दाईं ओर देखें। यदि यह दाईं ओर दिखाई देता है, तो बाईं ओर देखें। बिंदु को न देखें।',
        spt_title: 'स्मूथ परसूट',
        spt_desc: 'ट्रैकिंग टेस्ट। बिंदु का अनुसरण करें क्योंकि यह स्क्रीन पर आसानी से आगे-पीछे होता है।',
        spt_demo: 'अपनी निगाहें बिंदु पर जमाए रखें। इसे एक स्थिर गति से आगे बढ़ाएं। आगे न बढ़ें।',
        vgst_title: 'विजुअली गाइडेड सैकेड्स',
        vgst_desc: 'मानक रिफ्लेक्स परीक्षण। जितनी जल्दी हो सके बेतरतीब ढंग से कूदने वाले लक्ष्य का पालन करें।',
        vgst_demo: 'बस उस बिंदु को देखें जहां भी वह दिखाई दे।'
    },
    mr: {
        ocular_tests_title: "ओक्यूलर मोटर चाचण्या",
        ocular_tests_subtitle: "क्लिनिकल MHE तपासणी प्रोटोकॉल",
        start_demo: "डेमो पहा",
        start_test: "चाचणी सुरू करा",
        instruction: "प्रोटोकॉल सूचना",
        back_menu: "मेनूवर परत जा",
        fix_title: 'फिक्सेशन स्थिरता',
        fix_desc: 'बेसलाइन चाचणी. शक्य असल्यास पापणी न लवता 15 सेकंद मध्यबिंदूवर नजर स्थिर ठेवा.',
        fix_demo: 'फक्त मध्यबिंदूकडे पाहा. तुमचे डोके आणि डोळे शक्य तितके स्थिर ठेवा.',
        mgst_title: 'मेमरी गाइडेड सॅकेड्स',
        mgst_desc: 'वर्किंग मेमरी चाचणी. एक हिरवा ठिपका परिघावर दिसतो, मध्यभागी जातो आणि मग नाहीसा होतो. जिथे तो मूळचा होता त्या ठिकाणी परत पहा.',
        mgst_demo: '1. हिरवा ठिपका दिसतो (त्याकडे पहा). 2. मध्यभागी जातो (त्याकडे पहा). 3. नाहीसा होतो (जिथे तो सुरू झाला होता तिथे परत पहा!).',
        ast_title: 'अँटी-सॅकेड्स',
        ast_desc: 'इनहिबिटरी कंट्रोल चाचणी. जेव्हा लाल ठिपका एका बाजूला दिसतो, तेव्हा त्वरित विरुद्ध दिशेला पहा.',
        ast_demo: 'जर ठिपका डावीकडे दिसला, तर उजवीकडे पहा. जर तो उजवीकडे दिसला, तर डावीकडे पहा. ठिपक्याकडे पाहू नका.',
        spt_title: 'स्मूथ परसूट',
        spt_desc: 'ट्रॅकिंग चाचणी. ठिपका स्क्रीनवर सहजतेने मागे-पुढे होत असताना त्याचे अनुसरण करा.',
        spt_demo: 'तुमची नजर ठिपक्यावर खिळवून ठेवा. तो एका स्थिर गतीने हालचाल करतो. पुढे जाऊ नका.',
        vgst_title: 'व्हिज्युअली गाइडेड सॅकेड्स',
        vgst_desc: 'स्टँडर्ड रिफ्लेक्स चाचणी. यादृच्छिकपणे उडी मारणाऱ्या लक्ष्याचा शक्य तितक्या लवकर पाठलाग करा.',
        vgst_demo: 'फक्त तो ठिपका जिकडे दिसेल तिकडे पहा।'
    }
};
