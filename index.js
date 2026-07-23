require("dotenv").config();
const axios = require("axios");

const source = axios.create({
    baseURL: `https://${process.env.SOURCE_SUBDOMAIN}.zendesk.com/api/v2`,
    auth: {
        username: process.env.SOURCE_EMAIL,
        password: process.env.SOURCE_TOKEN
    }
});

const destination = axios.create({
    baseURL: `https://${process.env.DEST_SUBDOMAIN}.zendesk.com/api/v2`,
    auth: {
        username: process.env.DEST_EMAIL,
        password: process.env.DEST_TOKEN
    }
});

async function getAllArticles() {

    let articles = [];
    let url = "/help_center/articles.json";

    while (url) {

        const response = await source.get(url);

        articles.push(...response.data.articles);

        if (response.data.next_page) {
            url = response.data.next_page.replace(
                `https://${process.env.SOURCE_SUBDOMAIN}.zendesk.com/api/v2`,
                ""
            );
        } else {
            url = null;
        }
    }

    return articles;
}

async function createArticle(article, sectionIdDestino) {

    try {

        const payload = {
            article: {
                title: article.title,
                body: article.body,
                locale: article.locale,
                draft: article.draft,
                promoted: article.promoted,
                position: article.position,
                comments_disabled: article.comments_disabled,
                label_names: article.label_names
            }
        };

        const response = await destination.post(
            `/help_center/sections/${sectionIdDestino}/articles.json`,
            payload
        );

        console.log(`✔ ${article.title}`);

        return response.data;

    } catch (err) {

        console.error(`Erro: ${article.title}`);

        if (err.response) {
            console.log(err.response.data);
        }
    }
}

async function migrate() {

    const articles = await getAllArticles();

    console.log(`Encontrados ${articles.length} artigos`);

    const mapaSections = {
        123456789: 987654321,
        222222222: 333333333
    };

    for (const article of articles) {

        const novaSection = mapaSections[article.section_id];

        if (!novaSection) {
            console.log(`Section não mapeada: ${article.section_id}`);
            continue;
        }

        await createArticle(article, novaSection);

        await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log("Migração concluída.");
}

migrate();
