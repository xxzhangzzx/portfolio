import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function loadData() {
    const data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line),
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));

    return data;
}

function processCommits(data) {
    return d3
        .groups(data, (d) => d.commit)
        .map(([commit, lines]) => {
            let first = lines[0];
            let { author, date, time, timezone, datetime } = first;

            let ret = {
                id: commit,
                url: 'https://github.com/xxzhangzzx/portfolio/commit/' + commit,
                author,
                date,
                time,
                timezone,
                datetime,
                hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
                totalLines: lines.length,
            };

            Object.defineProperty(ret, 'lines', {
                value: lines,
                enumerable: false,
                writable: false,
                configurable: false,
            });

            return ret;
        });
}

function renderCommitInfo(data, commits) {
    const stats = d3.select('#stats');

    stats.selectAll('*').remove();

    const dl = stats.append('dl').attr('class', 'stats');

    const numberOfFiles = d3.group(data, (d) => d.file).size;
    const maxDepth = d3.max(data, (d) => d.depth);
    const averageLineLength = d3.mean(data, (d) => d.length);
    const longestLine = d3.greatest(data, (d) => d.length);

    const fileLengths = d3.rollups(
        data,
        (v) => d3.max(v, (d) => d.line),
        (d) => d.file,
    );

    const longestFile = d3.greatest(fileLengths, (d) => d[1]);

    const workByPeriod = d3.rollups(
        data,
        (v) => v.length,
        (d) => d.datetime.toLocaleString('en', { dayPeriod: 'short' }),
    );

    const maxPeriod = d3.greatest(workByPeriod, (d) => d[1])?.[0];

    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);

    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);

    dl.append('dt').text('Number of files');
    dl.append('dd').text(numberOfFiles);

    dl.append('dt').text('Longest file');
    dl.append('dd').text(`${longestFile[0]} with ${longestFile[1]} lines`);

    dl.append('dt').text('Maximum depth');
    dl.append('dd').text(maxDepth);

    dl.append('dt').text('Average line length');
    dl.append('dd').text(averageLineLength.toFixed(2));

    dl.append('dt').text('Longest line length');
    dl.append('dd').text(longestLine.length);

    dl.append('dt').text('Most active time of day');
    dl.append('dd').text(maxPeriod);
}

function renderTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-tooltip-time');
    const author = document.getElementById('commit-author');
    const lines = document.getElementById('commit-lines');

    if (Object.keys(commit).length === 0) {
        return;
    }

    link.href = commit.url;
    link.textContent = commit.id.slice(0, 7);

    date.textContent = commit.datetime?.toLocaleString('en', {
        dateStyle: 'full',
    });

    time.textContent = commit.datetime?.toLocaleString('en', {
        timeStyle: 'short',
    });

    author.textContent = commit.author;
    lines.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX + 12}px`;
    tooltip.style.top = `${event.clientY + 12}px`;
}

function renderScatterPlot(data, commits) {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 40 };

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    const xScale = d3
        .scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    const yScale = d3
        .scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);

    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);

    const rScale = d3
        .scaleSqrt()
        .domain([minLines, maxLines])
        .range([2, 30]);

    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    gridlines.call(
        d3
            .axisLeft(yScale)
            .tickFormat('')
            .tickSize(-usableArea.width),
    );

    const xAxis = d3.axisBottom(xScale);

    const yAxis = d3
        .axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    svg
        .append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    svg
        .append('g')
        .attr('class', 'y-axis')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    const dots = svg.append('g').attr('class', 'dots');

    dots
        .selectAll('circle')
        .data(sortedCommits, (d) => d.id)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .style('fill-opacity', 0.7)
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget).style('fill-opacity', 1);
            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mousemove', (event) => {
            updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
            d3.select(event.currentTarget).style('fill-opacity', 0.7);
            updateTooltipVisibility(false);
        });

    function isCommitSelected(selection, commit) {
        if (!selection) {
            return false;
        }

        const [[x0, y0], [x1, y1]] = selection;
        const x = xScale(commit.datetime);
        const y = yScale(commit.hourFrac);

        return x >= x0 && x <= x1 && y >= y0 && y <= y1;
    }

    function renderSelectionCount(selection) {
        const selectedCommits = selection
            ? commits.filter((d) => isCommitSelected(selection, d))
            : [];

        const countElement = document.querySelector('#selection-count');

        countElement.textContent = `${
            selectedCommits.length || 'No'
        } commits selected`;

        return selectedCommits;
    }

    function renderLanguageBreakdown(selection) {
        const selectedCommits = selection
            ? commits.filter((d) => isCommitSelected(selection, d))
            : [];

        const container = document.getElementById('language-breakdown');

        if (selectedCommits.length === 0) {
            container.innerHTML = '';
            return;
        }

        const lines = selectedCommits.flatMap((d) => d.lines);

        const breakdown = d3.rollup(
            lines,
            (v) => v.length,
            (d) => d.type,
        );

        container.innerHTML = '';

        for (const [language, count] of breakdown) {
            const proportion = count / lines.length;
            const formatted = d3.format('.1~%')(proportion);

            container.innerHTML += `
                <dt>${language}</dt>
                <dd>${count} lines (${formatted})</dd>
            `;
        }
    }

    function brushed(event) {
        const selection = event.selection;

        dots
            .selectAll('circle')
            .classed('selected', (d) => isCommitSelected(selection, d));

        renderSelectionCount(selection);
        renderLanguageBreakdown(selection);
    }

    svg.call(
        d3
            .brush()
            .extent([
                [usableArea.left, usableArea.top],
                [usableArea.right, usableArea.bottom],
            ])
            .on('start brush end', brushed),
    );

    svg.selectAll('.dots, .overlay ~ *').raise();
}

function updateScatterPlot(data, commits) {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 40 };

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    const svg = d3.select('#chart').select('svg');

    const xScale = d3
        .scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    const yScale = d3
        .scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);

    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);

    const rScale = d3
        .scaleSqrt()
        .domain([minLines, maxLines])
        .range([2, 30]);

    const xAxis = d3.axisBottom(xScale);

    const xAxisGroup = svg.select('g.x-axis');
    xAxisGroup.selectAll('*').remove();
    xAxisGroup.call(xAxis);

    const dots = svg.select('g.dots');
    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

    dots
        .selectAll('circle')
        .data(sortedCommits, (d) => d.id)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .style('fill-opacity', 0.7)
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget).style('fill-opacity', 1);
            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mousemove', (event) => {
            updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
            d3.select(event.currentTarget).style('fill-opacity', 0.7);
            updateTooltipVisibility(false);
        });
}

function updateFileDisplay(filteredCommits) {
    let lines = filteredCommits.flatMap((d) => d.lines);

    let files = d3
        .groups(lines, (d) => d.file)
        .map(([name, lines]) => {
            return { name, lines };
        })
        .sort((a, b) => b.lines.length - a.lines.length);

    let colors = d3.scaleOrdinal(d3.schemeTableau10);

    let filesContainer = d3
        .select('#files')
        .selectAll('div')
        .data(files, (d) => d.name)
        .join((enter) =>
            enter.append('div').call((div) => {
                div.append('dt');
                div.append('dd');
            }),
        );

    filesContainer
        .select('dt')
        .html((d) => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);

    filesContainer
        .select('dd')
        .selectAll('div')
        .data((d) => d.lines)
        .join('div')
        .attr('class', 'loc')
        .attr('style', (d) => `--color: ${colors(d.type)}`);
}

let data = await loadData();
let commits = processCommits(data);

let commitProgress = 100;

let timeScale = d3
    .scaleTime()
    .domain([
        d3.min(commits, (d) => d.datetime),
        d3.max(commits, (d) => d.datetime),
    ])
    .range([0, 100]);

let commitMaxTime = timeScale.invert(commitProgress);

let filteredCommits = commits;

function onTimeSliderChange() {
    commitProgress = Number(document.getElementById('commit-progress').value);
    commitMaxTime = timeScale.invert(commitProgress);

    document.getElementById('commit-time').textContent =
        commitMaxTime.toLocaleString('en', {
            dateStyle: 'long',
            timeStyle: 'short',
        });

    filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
    const filteredData = filteredCommits.flatMap((d) => d.lines);

    renderCommitInfo(filteredData, filteredCommits);
    updateScatterPlot(filteredData, filteredCommits);
    updateFileDisplay(filteredCommits);
}

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);
updateFileDisplay(filteredCommits);

document
    .getElementById('commit-progress')
    .addEventListener('input', onTimeSliderChange);

onTimeSliderChange();