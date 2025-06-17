const { Readable } = require('stream');
const axios = require('axios');

db = {};

db.get = (key) => {
    return fetch(`http://localhost:5200/api/db/${key}`)
        .then(response => {
            if (!response.ok) {
                return null;
            }
            return response.json();
        })
        .then((data) => {
            return data ? data.value : null;
        })
        .catch(() => null);
};

db.getMany = async (keys) => {
    const promises = keys.map(key =>
        fetch(`http://localhost:5200/api/db/${key}`)
            .then(response => {
                if (!response.ok) {
                    return null;
                }
                return response.json();
            })
            .then(data => data ? data : null)
            .catch(() => null)
    );
    return Promise.all(promises);
};

db.createValueStream = (query) => {

    return fetch(`http://localhost:5200/api/db/values?${new URLSearchParams(query).toString()}`)
        .then(response => response.ok ? response.json() : [])
        .then(values => {
            const stream = new Readable({ objectMode: true, read() { } });
            (values || []).forEach(value => stream.push(value));
            stream.push(null);
            return stream;
        })
        .catch(() => {
            const stream = new Readable({ objectMode: true, read() { } });
            stream.push(null);
            return stream;
        });
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

db.createKeyStream = (query) => {
    // 011 4 316316 0112 316 269
    return fetch(`http://localhost:5200/api/db/keys?${new URLSearchParams(query).toString()}`)
        .then(response => response.ok ? response.json() : [])
        .then(keys => {
            const stream = new Readable({ objectMode: true, read() { } });
            (keys || []).forEach(key => stream.push(key));
            stream.push(null);
            return stream;
        })
        .catch(() => {
            const stream = new Readable({ objectMode: true, read() { } });
            stream.push(null);
            return stream;
        });
};



db.del = (key) => {

    return fetch(`http://localhost:5200/api/db/${key}`, { method: 'DELETE' })
        .then(() => { })
        .catch(() => { });
};

db.put = async (key, value) => {

    try {
        const response = await fetch(`http://localhost:5200/api/db/${key}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value })
        });
        return await response.json();
    } catch {
        return;
    }
};


module.exports = db;    