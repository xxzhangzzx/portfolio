import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');
const projectsTitle = document.querySelector('.projects-title');
const searchInput = document.querySelector('.searchBar');

let query = '';
let selectedYear = null;

let colors = d3.scaleOrdinal(d3.schemeTableau10);

function getFilteredProjects() {
  let filteredProjects = projects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query.toLowerCase());
  });

  if (selectedYear !== null) {
    filteredProjects = filteredProjects.filter(
      (project) => String(project.year) === String(selectedYear)
    );
  }

  return filteredProjects;
}

function renderPieChart(projectsGiven) {
  let rolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year,
  );

  let data = rolledData.map(([year, count]) => {
    return { value: count, label: year };
  });

  let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  let sliceGenerator = d3.pie().value((d) => d.value);

  let arcData = sliceGenerator(data);

  let svg = d3.select('#projects-pie-plot');
  svg.selectAll('path').remove();

  let legend = d3.select('.legend');
  legend.selectAll('li').remove();

  arcData.forEach((d) => {
    svg
      .append('path')
      .attr('d', arcGenerator(d))
      .attr('fill', colors(d.data.label))
      .classed(
        'selected',
        selectedYear !== null && String(d.data.label) === String(selectedYear)
      )
      .on('click', () => {
        selectedYear =
          String(selectedYear) === String(d.data.label) ? null : d.data.label;

        updateProjects();
      });
  });

  data.forEach((d) => {
    legend
      .append('li')
      .attr('style', `--color:${colors(d.label)}`)
      .attr('class', 'legend-item')
      .classed(
        'selected',
        selectedYear !== null && String(d.label) === String(selectedYear)
      )
      .on('click', () => {
        selectedYear = String(selectedYear) === String(d.label) ? null : d.label;

        updateProjects();
      })
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
  });
}

function updateProjects() {
  let filteredProjects = getFilteredProjects();

  projectsTitle.textContent = `${filteredProjects.length} Projects`;

  renderProjects(filteredProjects, projectsContainer, 'h2');
  renderPieChart(filteredProjects);
}

searchInput.addEventListener('input', (event) => {
  query = event.target.value;
  updateProjects();
});

updateProjects();