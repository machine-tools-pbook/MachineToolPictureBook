import { defineConfig } from 'vite'

import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
    base: '/MachineToolPictureBook/',
    plugins: [
        viteStaticCopy({
            targets: [
                {
                    src: 'public/images/*',
                    dest: 'images'
                }
            ]
        })
    ],
    build: {
        outDir: 'dist',
    }
})
