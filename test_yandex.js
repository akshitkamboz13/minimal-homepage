async function testYandex() {
    const imageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    
    const form = new FormData();
    form.append('upfile', blob, 'dummy.png');
    
    const requestJson = JSON.stringify({blocks: [{block: "b-page_type_search-by-image__link"}]});
    
    const res = await fetch(`https://yandex.com/images/search?rpt=imageview&format=json&request=${encodeURIComponent(requestJson)}`, {
        method: 'POST',
        body: form
    });
    
    const text = await res.text();
    console.log(text.substring(0, 500));
}
testYandex();
