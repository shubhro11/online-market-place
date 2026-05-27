const { toFile } = require("@imagekit/nodejs");
const ImageKit = require("@imagekit/nodejs");
const { v4: uuidv4 } = require("uuid");

const client = new ImageKit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
});

async function uploadImage({ buffer, folder = "/products" }) {

  try {
    const result = await client.files.upload({
      file: await toFile(buffer, "file"),
      fileName: uuidv4(),
      folder: folder,
    });

    return {
        url: result.url,
        thumbnail: result.thumbnailUrl || result.url,
        id: result.fileId,
    };

  } catch (error) {
    console.error("Error occurred while uploading:", error);
  }
}

module.exports = uploadImage;
