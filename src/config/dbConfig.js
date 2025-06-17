const { Readable } = require('stream');
const axios = require('axios');

const db = {};

db.get = async (key) => {
    try {
        const response = await axios.get(`http://localhost:5200/api/db/${key}`);
        return response.data ? response.data.value : null;
    } catch {
        return null;
    }
};

db.getMany = async (keys) => {
    const promises = keys.map(async (key) => {
        try {
            const response = await axios.get(`http://localhost:5200/api/db/${key}`);
            return response.data ? response.data : null;
        } catch {
            return null;
        }
    });
    return Promise.all(promises);
};

db.createValueStream = async (query) => {
    try {
        const response = await axios.get(`http://localhost:5200/api/db/values`, {
            params: query
        });
        const values = response.data || [];
        const stream = new Readable({ objectMode: true, read() { } });
        (values || []).forEach(value => stream.push(value));
        stream.push(null);
        return stream;
    } catch {
        const stream = new Readable({ objectMode: true, read() { } });
        stream.push(null);
        return stream;
    }
};

db.createReadStream = async (query) => {
    try {
        const response = await axios.get(`http://localhost:5200/api/db`, {
            params: query
        });
        const items = response.data || [];
        return items;
    } catch {
        return [];
    }
};

db.createKeyStream = async (query) => {
    try {
        const response = await axios.get(`http://localhost:5200/api/db/keys`, {
            params: query
        });
        const keys = response.data || [];
        const stream = new Readable({ objectMode: true, read() { } });
        (keys || []).forEach(key => stream.push(key));
        stream.push(null);
        return stream;
    } catch {
        const stream = new Readable({ objectMode: true, read() { } });
        stream.push(null);
        return stream;
    }
};

db.del = async (key) => {
    try {
        await axios.delete(`http://localhost:5200/api/db/${key}`);
    } catch {
        // ignore
    }
};

db.put = async (key, value) => {
    try {
        const response = await axios.put(`http://localhost:5200/api/db/${key}`, { value });
        return response.data;
    } catch {
        return;
    }
};

module.exports = db;
