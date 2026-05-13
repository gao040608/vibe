/**
 * 向客户端写入一个结构化 NDJSON chunk，并在控制台打印
 * @param {Object} res - Express response 对象
 * @param {Object} obj - 要发送的数据对象
 */
function writeChunk(res, obj) {
  console.log('[chunk]', JSON.stringify(obj));
  if (res && !res.writableEnded) {
    res.write(JSON.stringify(obj) + '\n');
  }
}

module.exports = { writeChunk };
