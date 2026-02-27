// Compress image and convert to Base64
// maxWidth: Max width dimension
// quality: 0 to 1 (jpeg quality)
function compressImage(file, maxWidth = 1024, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Resize logic
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Compress to JPEG Base64
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

// Apply blur elements (rectangles or brush paths) to an image permanently
// imageSrc: base64 string
// blurs: array of objects. 
//   - Rect: { type: 'rect', x, y, w, h } (or legacy {x,y,w,h})
//   - Brush: { type: 'brush', points: [{x,y}, {x,y}...] }
function applyBlurToImage(imageSrc, blurs) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = imageSrc;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            
            // 1. Draw original sharp image
            ctx.drawImage(img, 0, 0);

            // Optimization: If no blurs, return early
            if (!blurs || blurs.length === 0) {
                resolve(imageSrc);
                return;
            }

            // 2. Prepare a blurred version of the ENTIRE image
            // We do this once to ensure high quality blur source
            const blurCanvas = document.createElement('canvas');
            blurCanvas.width = canvas.width;
            blurCanvas.height = canvas.height;
            const blurCtx = blurCanvas.getContext('2d');
            
            // Draw image and apply heavy blur
            blurCtx.filter = 'blur(20px)';
            blurCtx.drawImage(img, 0, 0);
            blurCtx.filter = 'none'; // Reset

            // 3. Create a Mask Canvas (White = Keep Blur, Transparent = Keep Sharp)
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = canvas.width;
            maskCanvas.height = canvas.height;
            const maskCtx = maskCanvas.getContext('2d');
            
            // Default to transparent
            maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
            maskCtx.fillStyle = 'white';
            maskCtx.strokeStyle = 'white';
            maskCtx.lineCap = 'round';
            maskCtx.lineJoin = 'round';

            // Draw all blur shapes onto the mask
            blurs.forEach(item => {
                if (item.type === 'brush' && item.points && item.points.length > 0) {
                    // Draw Brush Path
                    maskCtx.beginPath();
                    // Brush width relative to image size (e.g. 5%)
                    maskCtx.lineWidth = canvas.width * 0.05; 
                    
                    const pts = item.points;
                    maskCtx.moveTo(pts[0].x * canvas.width, pts[0].y * canvas.height);
                    
                    for (let i = 1; i < pts.length; i++) {
                        maskCtx.lineTo(pts[i].x * canvas.width, pts[i].y * canvas.height);
                    }
                    maskCtx.stroke();
                    
                    // Also draw circles at start/end to round off single clicks
                    if (pts.length === 1) {
                         maskCtx.beginPath();
                         maskCtx.arc(pts[0].x * canvas.width, pts[0].y * canvas.height, (canvas.width * 0.05) / 2, 0, Math.PI * 2);
                         maskCtx.fill();
                    }

                } else {
                    // Default / Legacy Rectangle
                    // Normalize legacy items that might not have 'type'
                    const x = (item.x || 0) * canvas.width;
                    const y = (item.y || 0) * canvas.height;
                    const w = (item.w || 0) * canvas.width;
                    const h = (item.h || 0) * canvas.height;
                    maskCtx.fillRect(x, y, w, h);
                }
            });

            // 4. Composite: Draw the Blurred image onto the Main canvas, using the Mask
            // We want to draw 'blurCanvas' ONLY where 'maskCanvas' is white.
            
            // Step A: Turn maskCanvas into a masking image for the blurCanvas
            // We reuse blurCtx for this composition to save memory
            blurCtx.globalCompositeOperation = 'destination-in';
            blurCtx.drawImage(maskCanvas, 0, 0);
            
            // Step B: Draw the masked blurred image onto the main canvas
            blurCtx.globalCompositeOperation = 'source-over'; // Reset
            ctx.drawImage(blurCanvas, 0, 0);

            const newDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            resolve(newDataUrl);
        };
        img.onerror = reject;
    });
}