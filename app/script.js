const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('captureBtn');
const statusEl = document.getElementById('status');
const outputEl = document.getElementById('output');

// Access camera
navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
        video.srcObject = stream;
    })
    .catch(err => {
        console.error('Could not access camera', err);
        statusEl.textContent = 'Camera access failed.';
    });

captureBtn.addEventListener('click', () => {
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    statusEl.textContent = 'Processing...';
    Tesseract.recognize(canvas, 'eng', { logger: m => console.log(m) })
        .then(({ data: { text } }) => {
            statusEl.textContent = 'Done.';
            outputEl.textContent = JSON.stringify(parseReceipt(text), null, 2);
        })
        .catch(err => {
            statusEl.textContent = 'Error running OCR';
            console.error(err);
        });
});

function parseReceipt(text) {
    const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
    const result = {
        store: '',
        items: [],
        total: 0,
    };

    if (lines.length) {
        result.store = lines[0];
    }

    const itemRegex = /(\D+)\s+(\d+)\s+(\d+(?:\.\d{2})?)/;
    lines.forEach(line => {
        const match = line.match(itemRegex);
        if (match) {
            result.items.push({
                name: match[1].trim(),
                quantity: parseInt(match[2], 10),
                price: parseFloat(match[3])
            });
        }
        if (/total/i.test(line)) {
            const num = line.match(/(\d+(?:\.\d{2})?)/);
            if (num) {
                result.total = parseFloat(num[1]);
            }
        }
    });
    return result;
}
