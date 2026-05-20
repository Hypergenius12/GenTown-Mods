window._origPopulateExecutive = window.populateExecutive;
window.populateExecutive = function(items, title, main) {
    if (title === "Customize") {
        items.forEach(item => {
            if (item.slider) {
                item._origSlider = item.slider;
                item._origFunc = item.func;
                item._origValue = item.value !== undefined ? item.value : item.default;
                delete item.slider;
                delete item.min;
                delete item.max;
                delete item.step;
                delete item.func;
            }
        });
    }
    window._origPopulateExecutive(items, title, main);
    if (title === "Customize") {
        const list = document.getElementById(main ? "actionMainList" : "actionSubList");
        const domItems = list.querySelectorAll(".actionItem.item");
        items.forEach((item, i) => {
            if (item._origSlider) {
                let el = domItems[i];
                if (el) {
                    el.innerHTML = `${item.text}: <input type="text" value="${item._origValue}" style="width:80px;background:rgba(0,0,0,0.5);color:white;border:1px solid #aaa;border-radius:4px;padding:2px 5px;margin-left:5px;font-family:inherit;">`;
                    let input = el.querySelector("input");
                    input.addEventListener("change", e => {
                        let val = parseFloat(e.target.value);
                        if (!isNaN(val)) item._origFunc(item._origSlider, val);
                    });
                    input.addEventListener("click", e => e.stopPropagation());
                    input.addEventListener("mousedown", e => e.stopPropagation());
                    input.addEventListener("keydown", e => {
                        e.stopPropagation();
                        if (e.key === "Enter") input.blur();
                    });
                }
            }
        });
    }
};
