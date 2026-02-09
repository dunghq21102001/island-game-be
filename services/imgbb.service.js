const axios = require("axios");

const IMGBB_API_KEY = process.env.IMGBB_API_KEY || "d160b75ffdfd44513a2b1e56374ccaa4";
const IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload";

/**
 * Upload ảnh lên ImgBB.
 * @param {string} imageBase64 - Chuỗi base64 của ảnh (có hoặc không có data URL prefix)
 * @returns {Promise<{ url: string, displayUrl: string }>}
 */
async function uploadImage(imageBase64) {
  let data = imageBase64;
  if (data.includes(",")) {
    data = data.split(",")[1];
  }

  const formData = new URLSearchParams();
  formData.append("key", IMGBB_API_KEY);
  formData.append("image", data);

  const response = await axios.post(IMGBB_UPLOAD_URL, formData, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 30000,
  });

  if (!response.data.success) {
    const err = new Error(response.data.error?.message || "ImgBB upload failed");
    err.status = 400;
    throw err;
  }

  return {
    url: response.data.data.url,
    displayUrl: response.data.data.display_url,
    deleteUrl: response.data.data.delete_url,
  };
}

module.exports = { uploadImage };
