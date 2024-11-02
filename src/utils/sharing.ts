export const canShare = (): boolean => {
    return !!(
      typeof navigator !== 'undefined' && 
      navigator.share && 
      typeof navigator.share === 'function'
    );
  };