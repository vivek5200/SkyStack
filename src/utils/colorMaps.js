export const applyColorMap = (value, min, max, colorMap = 'grayscale') => {
  const normalized = (value - min) / (max - min);
  
  switch (colorMap) {
    case 'grayscale':
      const gray = Math.floor(normalized * 255);
      return [gray, gray, gray, 255];
    
    case 'viridis':
      const r = Math.floor(Math.min(255, Math.max(0, (0.2627 + normalized * (1.0 - 0.2627)) * 255)));
      const g = Math.floor(Math.min(255, Math.max(0, (0.1077 + normalized * (0.7767 - 0.1077)) * 255)));
      const b = Math.floor(Math.min(255, Math.max(0, (0.0279 + normalized * (0.4375 - 0.0279)) * 255)));
      return [r, g, b, 255];
    
    case 'inferno':
      const infR = Math.floor(Math.min(255, Math.max(0, (0.8651 + normalized * (1.0 - 0.8651)) * 255)));
      const infG = Math.floor(Math.min(255, Math.max(0, (0.2439 + normalized * (0.5543 - 0.2439)) * 255)));
      const infB = Math.floor(Math.min(255, Math.max(0, (0.0060 + normalized * (0.0 - 0.0060)) * 255)));
      return [infR, infG, infB, 255];
    
    case 'hot':
      const hotR = Math.floor(Math.min(255, normalized * 3 * 255));
      const hotG = Math.floor(Math.min(255, Math.max(0, (normalized * 3 - 1) * 255)));
      const hotB = Math.floor(Math.min(255, Math.max(0, (normalized * 3 - 2) * 255)));
      return [hotR, hotG, hotB, 255];
    
    case 'jet':
      const jet = Math.min(255, Math.max(0, normalized * 4 * 255));
      let jetR, jetG, jetB;
      if (normalized < 0.125) {
        jetR = 0;
        jetG = 0;
        jetB = Math.floor(jet * 0.5 + 127.5);
      } else if (normalized < 0.375) {
        jetR = 0;
        jetG = Math.floor(jet - 127.5);
        jetB = 255;
      } else if (normalized < 0.625) {
        jetR = Math.floor(jet - 383.5);
        jetG = 255;
        jetB = Math.floor(511.5 - jet);
      } else if (normalized < 0.875) {
        jetR = 255;
        jetG = Math.floor(639.5 - jet);
        jetB = 0;
      } else {
        jetR = Math.floor(767.5 - jet * 0.5);
        jetG = 0;
        jetB = 0;
      }
      return [jetR, jetG, jetB, 255];
    
    default:
      const defaultGray = Math.floor(normalized * 255);
      return [defaultGray, defaultGray, defaultGray, 255];
  }
};