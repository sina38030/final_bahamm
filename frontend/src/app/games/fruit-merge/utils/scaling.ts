export function getCanvasScale(containerW: number, containerH: number, designW: number, designH: number) {
  const scale = Math.min(containerW / designW, containerH / designH);
  const width = Math.floor(designW * scale);
  const height = Math.floor(designH * scale);
  return { width, height, scale };
}


