import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		paraglideVitePlugin({ project: './project.inlang', outdir: './src/lib/paraglide' })
	],
	server: {
		// 휴대폰에서 dev 서버를 터널(cloudflared 등)로 열어 확인할 때 필요
		allowedHosts: ['.trycloudflare.com', '.ngrok-free.app', '.loca.lt']
	},
	ssr: {
		// lucide-svelte dist 가 확장자 없는 import 를 써서 Node ESM 이 못 풂 → Vite 가 처리하도록
		noExternal: ['lucide-svelte']
	},
	optimizeDeps: {
		include: ['lucide-svelte']
	}
});
