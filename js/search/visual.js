export function initVisualSearch() {
    const imageSearchBtn = document.getElementById('image-search-btn');
    const imageSearchInput = document.getElementById('image-search-input');
    const lensForm = document.getElementById('lens-form');
    const searchInput = document.getElementById('search-input');

    if (imageSearchBtn && imageSearchInput) {
        const imagePreviewContainer = document.getElementById('image-preview-container');
        const imagePreview = document.getElementById('image-preview');
        const clearImageBtn = document.getElementById('clear-image-btn');
        const searchModeWrapper = document.querySelector('.search-mode-wrapper');
        const modeGoogle = document.getElementById('mode-google');

        imageSearchBtn.addEventListener('click', () => {
            imageSearchInput.click();
        });

        imageSearchInput.addEventListener('change', () => {
            if (imageSearchInput.files.length > 0) {
                const file = imageSearchInput.files[0];
                const reader = new FileReader();
                reader.onload = (e) => {
                    imagePreview.src = e.target.result;
                    imagePreviewContainer.classList.remove('hidden');
                    
                    searchModeWrapper.classList.add('disabled-ai');
                    if (modeGoogle) modeGoogle.checked = true;
                    
                    if (searchInput) searchInput.focus();
                };
                reader.readAsDataURL(file);
            }
        });

        if (clearImageBtn) {
            clearImageBtn.addEventListener('click', () => {
                imageSearchInput.value = '';
                imagePreview.src = '';
                imagePreviewContainer.classList.add('hidden');
                searchModeWrapper.classList.remove('disabled-ai');
            });
        }
    }

    const modalDragDrop = document.getElementById('modal-drag-drop');
    const modalDragContent = document.getElementById('modal-drag-content');
    const modalPreviewContainer = document.getElementById('modal-preview-container');
    const modalImagePreview = document.getElementById('modal-image-preview');
    const modalClearImageBtn = document.getElementById('modal-clear-image-btn');
    const modalTextInput = document.getElementById('modal-text-input');
    const providerBtns = document.querySelectorAll('.search-provider-btn');

    if (modalDragDrop && imageSearchInput) {
        modalDragDrop.addEventListener('click', (e) => {
            if (e.target !== modalClearImageBtn && !modalClearImageBtn.contains(e.target)) {
                imageSearchInput.click();
            }
        });

        modalDragDrop.addEventListener('dragover', (e) => {
            e.preventDefault();
            modalDragDrop.classList.add('drag-over');
        });

        modalDragDrop.addEventListener('dragleave', () => {
            modalDragDrop.classList.remove('drag-over');
        });

        modalDragDrop.addEventListener('drop', (e) => {
            e.preventDefault();
            modalDragDrop.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                if (file.type.startsWith('image/')) {
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    imageSearchInput.files = dt.files;
                    imageSearchInput.dispatchEvent(new Event('change'));
                }
            }
        });

        imageSearchInput.addEventListener('change', () => {
            if (imageSearchInput.files.length > 0) {
                const file = imageSearchInput.files[0];
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (modalImagePreview) modalImagePreview.src = e.target.result;
                    if (modalDragContent) modalDragContent.classList.add('hidden');
                    if (modalPreviewContainer) modalPreviewContainer.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
        });

        if (modalClearImageBtn) {
            modalClearImageBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                imageSearchInput.value = '';
                if (modalImagePreview) modalImagePreview.src = '';
                if (modalPreviewContainer) modalPreviewContainer.classList.add('hidden');
                if (modalDragContent) modalDragContent.classList.remove('hidden');
            });
        }
    }

    const getBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });

    if (providerBtns && lensForm) {
        providerBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const provider = btn.getAttribute('data-provider');
                const hasImage = imageSearchInput.files.length > 0;
                const textQuery = modalTextInput ? modalTextInput.value.trim() : '';
                
                if (!hasImage) {
                    if (textQuery && typeof window.doSearch === 'function') window.doSearch(textQuery);
                    return;
                }

                const file = imageSearchInput.files[0];
                const oldHiddens = lensForm.querySelectorAll('input[type="hidden"]');
                oldHiddens.forEach(el => el.remove());

                if (provider === 'google') {
                    let actionUrl = 'https://lens.google.com/upload';
                    if (textQuery) {
                        actionUrl += `?q=${encodeURIComponent(textQuery)}`;
                    }
                    lensForm.action = actionUrl;
                    imageSearchInput.name = 'encoded_image';
                    lensForm.submit();
                } else if (provider === 'bing') {
                    try {
                        const base64DataUrl = await getBase64(file);
                        const base64Str = base64DataUrl.split(',')[1];
                        
                        let actionUrl = 'https://www.bing.com/images/search?view=detailv2&iss=sbiupload';
                        if (textQuery) {
                            actionUrl += `&q=${encodeURIComponent(textQuery)}`;
                            const qInput = document.createElement('input');
                            qInput.type = 'hidden';
                            qInput.name = 'q';
                            qInput.value = textQuery;
                            lensForm.appendChild(qInput);
                        }
                        lensForm.action = actionUrl;
                        imageSearchInput.removeAttribute('name');
                        
                        const cbirInput = document.createElement('input');
                        cbirInput.type = 'hidden';
                        cbirInput.name = 'cbir';
                        cbirInput.value = 'sbi';
                        lensForm.appendChild(cbirInput);
                        
                        const imgBinInput = document.createElement('input');
                        imgBinInput.type = 'hidden';
                        imgBinInput.name = 'imageBin';
                        imgBinInput.value = base64Str;
                        lensForm.appendChild(imgBinInput);
                        
                        lensForm.submit();
                    } catch (err) {
                        console.error("Error processing image for Bing", err);
                    }
                } else if (provider === 'yandex') {
                    try {
                        const formData = new FormData();
                        formData.append('upfile', file);
                        
                        const requestJson = JSON.stringify({blocks: [{block: "b-page_type_search-by-image__link"}]});
                        const res = await fetch(`https://yandex.com/images/search?rpt=imageview&format=json&request=${encodeURIComponent(requestJson)}`, {
                            method: 'POST',
                            body: formData
                        });
                        
                        if (res.ok) {
                            const data = await res.json();
                            const cbirId = data?.blocks?.[0]?.params?.cbirId;
                            if (cbirId) {
                                let targetUrl = `https://yandex.com/images/search?rpt=imageview&cbir_id=${cbirId}`;
                                if (textQuery) {
                                    targetUrl += `&text=${encodeURIComponent(textQuery)}`;
                                }
                                window.location.href = targetUrl;
                            } else {
                                console.error("No cbirId returned from Yandex");
                            }
                        }
                    } catch (err) {
                        console.error("Yandex upload error:", err);
                    }
                }
            });
        });
    }
}
