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
    SCIENCE_FICTION:'science_fiction',
    BIOGRAPHY:'biography'
  } as const;