/**
 * Replaces the page's getUserMedia with a synthetic canvas stream that draws a
 * QR image (passed as a data URL) on every frame. html5-qrcode drives its
 * decoder from the <video> bound to the returned stream, so a visible, stable
 * QR is decoded exactly as if a real camera was pointed at a printed code.
 *
 * The painter is an init script: it runs before page scripts, setting up the
 * override without any waiting needed from the test.
 */
export function syntheticCameraInitScript(qrDataUrl: string): string {
  return `
    (() => {
      const img = new Image();
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");
      let painting = false;

      img.onload = () => {
        const paint = () => {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          // Center the QR in the 640x480 video. html5-qrcode samples a
          // centered ~448x336 source crop (the qrbox center square scaled
          // from the square client container to the video), roughly
          // x in [96,544), y in [72,408). A 300x300 QR centred at (320,240)
          // spans x [170,470), y [90,390) — fully inside that sample box with
          // margins all around, so every finder pattern is always visible.
          const size = 300;
          ctx.drawImage(
            img,
            (canvas.width - size) / 2,
            (canvas.height - size) / 2,
            size,
            size
          );
          painting = true;
        };
        // Ensure the first frame is painted before any consumer starts.
        paint();
        setInterval(paint, 150);
      };
      img.src = ${JSON.stringify(qrDataUrl)};

      const md = navigator.mediaDevices;
      if (md && md.getUserMedia) {
        md.getUserMedia = async () => {
          // Ensure at least one paint happened and the stream has frames.
          while (!painting) {
            await new Promise((r) => setTimeout(r, 50));
          }
          return canvas.captureStream(15);
        };
      }
    })();
  `;
}

/** Infinite solid-color stream for the "camera denied/unavailable" state. */
export function blankStreamInitScript(): string {
  return `
    (() => {
      const md = navigator.mediaDevices;
      if (md && md.getUserMedia) {
        md.getUserMedia = async () => {
          const canvas = document.createElement("canvas");
          canvas.width = 640;
          canvas.height = 480;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#808080";
          ctx.fillRect(0, 0, 640, 480);
          return canvas.captureStream(15);
        };
      }
    })();
  `;
}