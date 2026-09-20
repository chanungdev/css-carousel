import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { transform } from 'esbuild';

const ROOT = process.cwd();
const PORT = 5173;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://localhost:${PORT}`);
  const filePath = join(ROOT, normalize(decodeURIComponent(pathname)));

  // 경로 탈출 차단: ROOT 밖으로 나가는 요청은 거부한다
  if (filePath !== ROOT && !filePath.startsWith(ROOT + sep)) {
    res.writeHead(403).end('forbidden');
    return;
  }

  try {
    const body = await readFile(filePath);
    res.writeHead(200, {
      'content-type': TYPES[extname(filePath)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(body);
    return;
  } catch {
    // 아래에서 .ts 원본을 찾아본다
  }

  // 소스는 TypeScript지만 ESM 관례대로 import 지정자는 .js로 쓴다.
  // 브라우저가 요청한 .js를 같은 이름의 .ts로 해석해 즉석에서 변환한다 —
  // 그래야 픽스처가 src/를 그대로 부르면서도 테스트 루프에 빌드가 안 낀다.
  if (extname(filePath) === '.js') {
    try {
      const source = await readFile(filePath.replace(/\.js$/, '.ts'), 'utf8');
      const { code } = await transform(source, { loader: 'ts', format: 'esm', target: 'es2022' });
      res.writeHead(200, { 'content-type': TYPES['.js'], 'cache-control': 'no-store' });
      res.end(code);
      return;
    } catch {
      // 404로 떨어진다
    }
  }

  res.writeHead(404).end('not found');
}).listen(PORT, () => console.log(`serving ${ROOT} on http://localhost:${PORT}`));
