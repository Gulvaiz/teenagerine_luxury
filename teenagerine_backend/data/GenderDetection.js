const GENDER_PATTERNS = {
    women: {
        keywords: ['women', 'woman', 'ladies', 'girl', 'female', 'her', 'she'],
        exclusions: ['men', 'man', 'boy', 'male', 'his', 'he']
    },
    men: {
        keywords: ['men', 'man', 'boys', 'male', 'him', 'his'],
        exclusions: ['women', 'woman', 'ladies', 'girl', 'female', 'her', 'she', 'skirt', 'dress']
    },
    kids: {
        keywords: ['kid', 'kids', 'child', 'children', 'boy', 'girl', 'baby'],
        exclusions: []
    },
    unisex: {
        keywords: ['unisex', 'all'],
        exclusions: []
    }
};

module.exports = { GENDER_PATTERNS };
