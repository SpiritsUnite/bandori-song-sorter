namespace sorter {

    interface Filters {
        diff: Set<string>;
        display: Display;
    }

    function parse_filters(): Filters {
        return {
            diff: new Set(["easy", "normal", "hard", "expert", "special"].filter(d =>
                (<HTMLInputElement>document.getElementById(d + "-filter")).checked)),
            display: parseInt(get_input(document.getElementById("display"))),
        };
    }

    function save_filters(): void {
        const filter_fields = document.querySelectorAll("#filters input,#filters select");
        for (let i = 0; i < filter_fields.length; i++) {
            save_field(<HTMLElement>filter_fields[i]);
        }
    }

    function load_filters(): void {
        const filter_fields = document.querySelectorAll("#filters input,#filters select");
        for (let i = 0; i < filter_fields.length; i++) {
            load_field(<HTMLElement>filter_fields[i]);
        }
    }

    interface ChartRow {
        song: Song;
        chart: Chart;
        diff: string;
        min: number;
        avg: number;
        max: number;
    }
    let chart_table : ChartRow[];
    let chart_options : Options;

    function gen_song_table(options : Options) {
        chart_options = options;
        chart_table = [];

        let bp = options.bp || 100;
        for (let song of song_data) {
            for (let [diff, chart] of Object.entries(song.charts)) {
                if (!chart) continue;
                let [min, max] = min_max_mult(chart, options.skills, options);
                chart_table.push({
                    song: song,
                    chart: chart,
                    diff: diff,
                    min: min,
                    avg: Math.min(avg_mult(chart, options.skills, options) * bp, max),
                    max: max,
                });
            }
        }
        display_song_table();
    }

    let sort_col = 4;
    let sort_dir = -1;

    function pass_filters(filters: Filters, row: ChartRow) : boolean {
        if (!filters.diff.has(row.diff)) return false;
        return true;
    }

    function display_song_table() {
        reset_table();
        let sortable : [string, string, number, number, number, number, number][] = [];

        const filters = parse_filters();
        save_filters();
        for (let row of chart_table) {
            if (!pass_filters(filters, row)) continue;
            let title = locale_title(row.song, filters.display);
            title && sortable.push([title, row.diff, row.chart.level, row.min,
                row.avg, row.max, row.song.song_id]);
        }

        sortable.sort((a, b) => {
            let [ax, bx] = [a[sort_col], b[sort_col]];
            if (typeof ax === "string") {
                return ax.localeCompare(<string>bx) * sort_dir;
            } else {
                return (ax - <number>bx) * sort_dir;
            }
        });
        let score_end = chart_options.bp ? "" : "%";
        for (let [title, diff, level, min, avg, max, song_id] of sortable) {
            add_row(
                [title, `order.html?song_id=${song_id}&diff=${diff}`],
                diff, level.toString(),
                Math.round(min).toLocaleString() + score_end,
                Math.round(avg).toLocaleString() + score_end,
                Math.round(max).toLocaleString() + score_end
            );
        }
    }

    let options_ui;

    async function init() {
        options_ui = new OptionsUI();
        await options_ui.init();

        load_filters();
        options_ui.add_listener(gen_song_table);

        ["easy", "normal", "hard", "expert", "special"].forEach(d =>
            (<HTMLInputElement>document.getElementById(d + "-filter"))
            .addEventListener("change", display_song_table));

        const display_sel = <HTMLSelectElement>document.getElementById("display");
        display_sel.addEventListener("change", display_song_table);

        const thead = document.querySelector("thead");
        if (thead) {
            let cells = thead.rows[0].cells;
            for (let i = 0; i < cells.length; i++) {
                cells[i].addEventListener("click", () => {
                    cells[sort_col].lastElementChild!.classList.add("invisible");
                    if (i == sort_col) sort_dir *= -1;
                    else [sort_col, sort_dir] = [i, i <= 1 ? 1 : -1];
                    cells[i].lastElementChild!.textContent = sort_dir === 1 ? "arrow_drop_up" : "arrow_drop_down";
                    cells[i].lastElementChild!.classList.remove("invisible");
                    display_song_table();
                });
            }
        }
    }

    init()
}