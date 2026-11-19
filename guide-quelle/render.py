import asyncio,sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--allow-file-access-from-files'])
        pg=await b.new_page()
        await pg.goto('file:///home/claude/guide/guide.html'); await pg.wait_for_selector('body[data-ready]'); await pg.evaluate('document.fonts.ready'); await pg.wait_for_timeout(800)
        await pg.pdf(path='/home/claude/guide/kohlfahrten-guide.pdf',format='A4',print_background=True,prefer_css_page_size=True)
        await pg.set_viewport_size({'width':794,'height':1123})
        n=await pg.evaluate("document.querySelectorAll('.page').length")
        for i in range(n):
            el=(await pg.query_selector_all('.page'))[i]
            await el.screenshot(path=f'/home/claude/guide/p{i+1:02d}.png')
        await b.close(); print('pages',n)
asyncio.run(main())
