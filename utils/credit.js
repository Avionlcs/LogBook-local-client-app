const crypto = require("crypto");
const readline = require("readline");


function generateSecretKey(baseSecretKey) {

  return crypto
    .createHash("sha256")
    .update(baseSecretKey)
    .digest("hex")
    .slice(0, 32);
}

function encrypt(text, secretKey) {
  secretKey = generateSecretKey("c3cff979def469cd7338eddC1847e940");
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(secretKey),
    iv
  );
  let encrypted = cipher.update(text.toString(), "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + encrypted;
}

// Create an interface to get user input from the console
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Ask the user to input a float value
rl.question("Enter a float value to encrypt: ", (input) => {
  const floatValue = parseFloat(input); // Convert the input to a float

  if (isNaN(floatValue)) {
    console.log("Invalid input. Please enter a valid float number.");
  } else {
    // Encrypt the float value
    const encryptedValue = encrypt(floatValue);
    console.log("Encrypted Value:", encryptedValue);
  }

  rl.close(); // Close the input stream
});
