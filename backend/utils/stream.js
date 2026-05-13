/**
 * 向客户端写入一个结构化 NDJSON chunk
 * @param {Object} res - Express response 对象
 * @param {Object} obj - 要发送的数据对象
 */
function writeChunk(res, obj) {
  if (res && !res.writableEnded) {
    res.write(JSON.stringify(obj) + '\n');
  }
}

module.exports = { writeChunk };
