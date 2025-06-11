# airecieptapp

A simple web application that turns paper receipts into digital form using your device's camera. It uses the browser's camera API and [Tesseract.js](https://github.com/naptha/tesseract.js) for OCR to extract information such as store name, items, quantity and price.

## Running the app

1. Open the `app/index.html` file in a modern browser (Chrome, Firefox, or mobile browsers).
2. Allow camera access when prompted.
3. Point the camera at a receipt and press **Capture**.
4. The recognized details will appear on screen in a structured JSON format.

No build step or server is required; everything runs locally in the browser.
