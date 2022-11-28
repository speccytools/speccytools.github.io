$(function () {
    const fetchIndex = async (database, indexes, index) => {
        try
        {
            $("#content").html("Fetching index " + index + "...");
            const response = await $.getJSON("https://networkcalc.com/api/dns/lookup/" + index);

            if (response.records && response.records.TXT) {
                for (let record of response.records.TXT) {
                    const recordOptions = record.split(";");
                    const values = {};
                    for (let recordOption of recordOptions) {
                        const kv = recordOption.split("=");
                        if (kv.length !== 2)
                            continue;
                        values[kv[0]] = kv[1];
                    }
                    if ("type" in values) {
                        switch (values.type) {
                            case 'tnfs': {
                                if ('host' in values) {
                                    if (!(values.host in database)) {
                                        database[values.host] = values;
                                    }
                                }
                                break;
                            }
                            case 'index': {
                                if ('host' in values) {
                                    if (!(values.host in indexes)) {
                                        indexes[values.host] = values;
                                        await fetchIndex(database, indexes, values.host);
                                    }
                                }
                                break;
                            }
                        }
                    }
                }
            }
        }
        catch (e)
        {
            console.log("Failed to fetch index: " + index);
        }
    };

    async function startup() {
        const database = {};
        const indexes = {};

        // one root index for now
        await fetchIndex(database, indexes, "index.speccytools.org");

        const entries = [];
        for (let key in database) {
            entries.push(database[key]);
        }

        return entries;
    }

    let query = null;

    function refine(entries) {
        if (query) {
            const result = [];
            for (let v of entries) {
                if (v.host.includes(query)) {
                    result.push(v);
                    continue;
                }
                if ('title' in v && v.title.includes(query)) {
                    result.push(v);
                    continue;
                }
                if ('tags' in v && v.tags.includes(query)) {
                    result.push(v);
                }
            }
            return result;
        }
        return entries;
    }

    function render(entries, offset, limit) {
        const content = $("#content");
        const contentHeader = $("#content-header");
        const contentHeaderStatus = $('#content-header-status');
        const refined = refine(entries);
        const keysNum = refined.length;
        let items = keysNum;
        if (items > limit) {
            items = limit;
        }
        let i = 0;
        content.html('');
        contentHeader.show();

        const search = $('#content-header input').off().on('input',function(e){
            query = search[0].value;
            render(entries, offset, limit);
        }).focus();

        if (items) {
            contentHeaderStatus.html('');
            const h = $('<div class="bullet">' + items + ' out of ' + keysNum + ', pages: </div>')
                .appendTo(contentHeaderStatus);

            const pages = Math.ceil(keysNum / limit);
            const currentPage = offset / limit;

            for (let pg = 0; pg < pages; pg++) {
                if (pg) {
                    $('<span class="spacer"></span>').appendTo(h);
                }
                if (pg === currentPage) {

                    $('<span class="active-page">' + (pg+1) + '</span>').off().click(()=>{
                        render(entries, pg * limit, limit);
                    }).appendTo(h);
                } else {
                    $('<a href="#">' + (pg+1) + '</a>').off().click(()=>{
                        render(entries, pg * limit, limit);
                    }).appendTo(h);
                }

            }
        } else {
            if (query) {
                contentHeaderStatus.html('<div class="bullet error">No results</div>');
            } else {
                contentHeaderStatus.html('<div class="bullet error">Index is empty (something is wrong?)</div>');
            }
        }


        $('<br/><br/>').appendTo(content);

        let lt = offset + limit;
        if (lt >= refined.length)
            lt = refined.length;

        for (let i = offset; i < lt; i++) {
            const values = refined[i];

            const entry = $('<div class="bullet"><a href="/emu/?tnfs=' + values.host +
                '">' + values.host + '</a></div>').appendTo(content);
            if ('title' in values) {
                $('<div>' + values.title + '</div>').appendTo(content);
            }
            if ('tags' in values) {
                $('<span class="tags">' + values.tags + '</span>').appendTo(entry);
            }

            $('<br/>').appendTo(content);
        }
    }

    startup().then((database) => {
        render(database, 0, 8);
    });
});