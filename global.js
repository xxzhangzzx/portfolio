console.log('IT’S ALIVE!');

export async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    console.log(response);

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
}

const pages = [
    { url: "", title: "Home" },
    { url: "projects/", title: "Projects" },
    { url: "contact/", title: "Contact" },
    { url: "resume/", title: "Resume" },
    { url: "https://github.com/xxzhangzzx", title: "GitHub" },
];

const BASE_PATH =
    location.hostname === "localhost" || location.hostname === "127.0.0.1"
        ? "/"
        : "/portfolio/";

let nav = document.createElement("nav");
document.body.prepend(nav);

for (let p of pages) {
    let url = p.url;
    let title = p.title;

    url = !url.startsWith("http") ? BASE_PATH + url : url;

    let a = document.createElement("a");
    a.href = url;
    a.textContent = title;

    if (a.host === location.host && a.pathname === location.pathname) {
        a.classList.add("current");
    }

    if (a.host !== location.host) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
    }

    nav.append(a);
}

document.body.insertAdjacentHTML(
    "afterbegin",
    `
        <label class="color-scheme">
            Theme:
            <select>
                <option value="light dark">Automatic</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
            </select>
        </label>
    `
);

let select = document.querySelector(".color-scheme select");

function setColorScheme(colorScheme) {
    document.documentElement.style.setProperty("color-scheme", colorScheme);
    select.value = colorScheme;
}

if ("colorScheme" in localStorage) {
    setColorScheme(localStorage.colorScheme);
} else {
    setColorScheme("light dark");
}

select.addEventListener("input", function (event) {
    let colorScheme = event.target.value;
    setColorScheme(colorScheme);
    localStorage.colorScheme = colorScheme;
});

let form = document.querySelector("form");

form?.addEventListener("submit", function (event) {
    event.preventDefault();

    let data = new FormData(form);
    let url = form.action + "?";
    let params = [];

    for (let [name, value] of data) {
        params.push(`${name}=${encodeURIComponent(value)}`);
    }

    url += params.join("&");
    location.href = url;
});

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  if (!containerElement) {
    console.error('Invalid container element');
    return;
  }

  if (!Array.isArray(projects)) {
    console.error('Projects data is not an array');
    return;
  }

  const validHeadings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

  if (!validHeadings.includes(headingLevel)) {
    headingLevel = 'h2';
  }

  containerElement.innerHTML = '';

  for (const project of projects) {
    const article = document.createElement('article');

    article.innerHTML = `
      <${headingLevel}>${project.title}</${headingLevel}>
      <img src="${project.image}" alt="${project.title}">
      <div>
        <p>${project.description}</p>
        <p class="project-year">${project.year}</p>
      </div>
    `;

    containerElement.appendChild(article);
  }
}

export async function fetchGitHubData(username) {
  try {
    const response = await fetch(`https://api.github.com/users/${username}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch GitHub data: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching GitHub data:', error);
  }
}