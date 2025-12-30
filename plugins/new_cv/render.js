fetch("data.json")
  .then(res => res.json())
  .then(data => {
    document.getElementById("name").textContent = data.profile.full_name;
    document.getElementById("title").textContent = data.profile.title;
    document.getElementById("meta").textContent =
      `${data.profile.location} • ${data.profile.phone} • ${data.profile.email}`;

    document.getElementById("summary").textContent = data.summary;

    const spreadsRoot = document.getElementById("spreads");
    spreadsRoot.innerHTML = "";

    const mainBlocks = buildMainBlocks(data);
    const sideBlocks = buildSideBlocks(data);

    paginateBlocks(spreadsRoot, mainBlocks, sideBlocks);
  });

function format(start, end) {
  if (!start) return "";
  const f = v => v.includes("-") ? v.split("-").reverse().join("/") : v;
  return end ? `${f(start)} – ${f(end)}` : `${f(start)} – In corso`;
}

function createSectionTitle(text) {
  const h3 = document.createElement("h3");
  h3.className = "section-title";
  h3.textContent = text;
  return h3;
}

function createSectionBlock(titleText, itemEl) {
  const block = document.createElement("div");
  block.className = "section-block";
  if (titleText) {
    block.appendChild(createSectionTitle(titleText));
  }
  block.appendChild(itemEl);
  return block;
}

function createGapBlock() {
  const gap = document.createElement("div");
  gap.className = "section-gap";
  return gap;
}

function createJob(job) {
  const div = document.createElement("div");
  div.className = "job";
  div.innerHTML = `
    <div class="job-title">${job.role}</div>
    <div class="job-meta">${job.company} • ${format(job.start, job.end)} • ${job.location}</div>
    <ul>${job.tasks.map(t => `<li>${t}</li>`).join("")}</ul>
  `;
  return div;
}

function createEdu(edu) {
  const div = document.createElement("div");
  div.className = "edu";
  div.innerHTML = `
    <div class="edu-title">${edu.title}</div>
    <div class="edu-meta">${edu.school} · ${edu.year} · ${edu.location}</div>
  `;
  return div;
}

function buildMainBlocks(data) {
  const blocks = [];
  if (data.experience.length > 0) {
    blocks.push(createSectionTitle("Esperienze lavorative"));
    blocks.push(createJob(data.experience[0]));
    for (let i = 1; i < data.experience.length; i++) {
      blocks.push(createJob(data.experience[i]));
    }
  }

  if (data.education.length > 0) {
    if (data.experience.length > 0) {
      blocks.push(createGapBlock());
    }
    blocks.push(createSectionBlock(
      "Formazione",
      createEdu(data.education[0])
    ));
    for (let i = 1; i < data.education.length; i++) {
      blocks.push(createEdu(data.education[i]));
    }
  }

  return blocks;
}

function createSkillsCard(skills) {
  const section = document.createElement("section");
  section.className = "card side-card competenze";
  const title = document.createElement("h4");
  title.textContent = "Competenze";
  const ul = document.createElement("ul");
  const allSkills = [...skills.core, ...skills.soft];
  ul.innerHTML = allSkills.map(i => `<li>${i}</li>`).join("");
  section.append(title, ul);
  return section;
}

function createLanguagesCard(languages) {
  const section = document.createElement("section");
  section.className = "card side-card lingue";
  const title = document.createElement("h4");
  title.textContent = "Lingue";
  const list = document.createElement("div");
  list.innerHTML = languages.map(l => `${l.name}: ${l.level}`).join("<br>");
  section.append(title, list);
  return section;
}

function createInfoCard(extra) {
  const section = document.createElement("section");
  section.className = "card side-card info";
  const title = document.createElement("h4");
  title.textContent = "Info aggiuntive";
  const ul = document.createElement("ul");
  ul.className = "info-list";
  ul.innerHTML = Object.values(extra).map(v => `<li>${v}</li>`).join("");
  section.append(title, ul);
  return section;
}

function buildSideBlocks(data) {
  return [
    createSkillsCard(data.skills),
    createLanguagesCard(data.languages),
    createInfoCard(data.extra),
  ];
}

function createSpread(pageBreak) {
  const spread = document.createElement("div");
  spread.className = "spread spread-columns";
  if (pageBreak) {
    spread.classList.add("page-break");
  }

  const columns = document.createElement("div");
  columns.className = "columns";
  const main = document.createElement("main");
  main.className = "main";
  const side = document.createElement("aside");
  side.className = "side";
  columns.append(main, side);
  spread.appendChild(columns);
  return { spread, main, side, columns };
}

function mmToPx(mm) {
  const div = document.createElement("div");
  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.height = `${mm}mm`;
  document.body.appendChild(div);
  const px = div.getBoundingClientRect().height;
  div.remove();
  return px;
}

function outerHeight(el) {
  const styles = getComputedStyle(el);
  return el.getBoundingClientRect().height +
    parseFloat(styles.marginTop) +
    parseFloat(styles.marginBottom);
}

function measureBlock(block, container) {
  const clone = block.cloneNode(true);
  container.appendChild(clone);
  const height = outerHeight(clone);
  container.removeChild(clone);
  return height;
}

function paginateBlocks(spreadsRoot, mainBlocks, sideBlocks) {
  const page = document.querySelector(".page");
  const header = document.querySelector(".header");
  const profile = document.querySelector(".spread-profile");
  const pageStyles = getComputedStyle(page);
  const padTop = parseFloat(pageStyles.paddingTop);
  const padBottom = parseFloat(pageStyles.paddingBottom);
  const padLeft = parseFloat(pageStyles.paddingLeft);
  const padRight = parseFloat(pageStyles.paddingRight);

  const pageHeight = mmToPx(297);
  const contentHeight = pageHeight - padTop - padBottom;
  const usedTop = outerHeight(header) + outerHeight(profile);
  const remainingFirst = Math.max(0, contentHeight - usedTop);

  const contentWidth = page.getBoundingClientRect().width - padLeft - padRight;

  const columnsTemplate = document.createElement("div");
  columnsTemplate.className = "columns";
  columnsTemplate.style.position = "absolute";
  columnsTemplate.style.visibility = "hidden";
  columnsTemplate.style.left = "-9999px";
  document.body.appendChild(columnsTemplate);
  const columnsMarginTop = parseFloat(getComputedStyle(columnsTemplate).marginTop) || 0;
  document.body.removeChild(columnsTemplate);

  const measure = document.createElement("div");
  measure.className = "columns";
  measure.style.position = "absolute";
  measure.style.visibility = "hidden";
  measure.style.pointerEvents = "none";
  measure.style.left = "-9999px";
  measure.style.top = "0";
  measure.style.width = `${contentWidth}px`;
  measure.style.marginTop = "0";

  const measureMain = document.createElement("main");
  measureMain.className = "main";
  const measureSide = document.createElement("aside");
  measureSide.className = "side";
  measure.append(measureMain, measureSide);
  document.body.appendChild(measure);

  const maxHeightFull = Math.max(0, contentHeight - columnsMarginTop);
  const maxHeightFirst = Math.max(0, remainingFirst - columnsMarginTop + 48);

  mainBlocks.forEach(block => {
    block._height = measureBlock(block, measureMain);
  });
  sideBlocks.forEach(block => {
    block._height = measureBlock(block, measureSide);
  });

  document.body.removeChild(measure);

  const firstSideHeight = sideBlocks[0]?._height ?? Infinity;
  const forceBreakFirst =
    maxHeightFirst <= 0 ||
    firstSideHeight > maxHeightFirst;

  let mainIndex = 0;
  let sideIndex = 0;
  let pageIndex = 0;

  while (mainIndex < mainBlocks.length || sideIndex < sideBlocks.length) {
    const isFirst = pageIndex === 0;
    const maxHeight = isFirst ? maxHeightFirst : maxHeightFull;
    const maxHeightSide = isFirst ? maxHeightFirst + 120 : maxHeightFull;
    const pageBreak = !isFirst || forceBreakFirst;

    const { spread, main, side } = createSpread(pageBreak);

    let usedMain = 0;
    let addedMain = false;
    while (mainIndex < mainBlocks.length) {
      const block = mainBlocks[mainIndex];
      if (usedMain + block._height <= maxHeight || !addedMain) {
        main.appendChild(block);
        usedMain += block._height;
        mainIndex += 1;
        addedMain = true;
      } else {
        break;
      }
    }

    let usedSide = 0;
    while (sideIndex < sideBlocks.length) {
      const block = sideBlocks[sideIndex];
      if (usedSide + block._height > maxHeightSide) {
        break;
      }
      side.appendChild(block);
      usedSide += block._height;
      sideIndex += 1;
    }

    spreadsRoot.appendChild(spread);
    pageIndex += 1;
  }
}
