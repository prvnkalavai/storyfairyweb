export const STORY_LENGTHS = {
    SHORT: 'short',
    MEDIUM: 'medium',
    LONG: 'long',
    EPIC: 'epic',
    SAGA: 'saga'
  } as const;
  
  export const IMAGE_STYLES = {
    WHIMSICAL: 'whimsical',
    REALISTIC: 'realistic',
    ANIMATION: 'animation',
    DISNEY: 'disney',
    PIXAR: 'pixar',
    STUDIOGHIBLI: 'studioghibli',
    ANIME: 'anime',
    FANTASY: 'fantasy',
    CARTOON: 'cartoon',
    CLAYMATION: 'claymation',
    COMICBOOK: 'comicbook',
    WATERCOLOR: 'watercolor',
    PAINTING: 'painting',
    ILLUSTRATION: 'illustration'
  } as const;

  export const STORY_MODELS = {
    GEMINI_1_5_FLASH: 'gemini',
    GPT_4O_Turbo: 'openai',
    GROK: 'grok'
  } as const;

  export const IMAGE_MODELS = {
    FLUX_SCHNELL: 'flux_schnell',
    STABLE_DIFFUSION_3: 'stable_diffusion_3',
    FLUX_PRO : 'flux_pro'
    //IMAGEN_3: 'imagen_3'
  } as const;

  export const STORY_STYLES = {
    ADVENTURE:'adventure',
    FANTASY:'fantasy',
    FAIRYTALE:'fairytale',
    MYSTERY:'mystery',
    SCIENCE_FICTION:'science_fiction'
  } as const;

  export const VOICES = {
    Natasha_AU:'en-AU-NatashaNeural',
    William_AU:'en-AU-WilliamNeural',
    Clara_CA:'en-CA-ClaraNeural',
    Liam_CA:'en-CA-LiamNeural',
    Sonia_GB:'en-GB-SoniaNeural',
    Maisie_GB:'en-GB-MaisieNeural',
    Ryan_GB:'en-GB-RyanNeural',
    Kavya_IN:'en-IN-KavyaNeural',
    Aarav_IN:'en-IN-AaravNeural',
    Connor_IE:'en-IE-ConnorNeural',
    Emily_IE:'en-IE-EmilyNeural',
    Ava_US:'en-US-AvaNeural',
    Ana_US:'en-US-AnaNeural',
    Jenny_US:'en-US-JennyNeural',
    Luna_US:'en-US-LunaNeural',
    Brian_US:'en-US-BrianNeural',
    Blue_US:'en-US-BlueNeural',
    Leah_ZA:'en-ZA-LeahNeural'
  }