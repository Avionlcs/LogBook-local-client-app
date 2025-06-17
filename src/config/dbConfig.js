const { Readable } = require('stream');

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
            console.log('<<< >> > << > >< < ', data.value);
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

db.createReadStream = (query) => {
    return fetch(`http://localhost:5200/api/db?${new URLSearchParams(query).toString()}`)
        .then(response => response.ok ? response.json() : [])
        .then(items => {
            const stream = new Readable({ objectMode: true, read() { } });
            (items || []).forEach(item => stream.push(item));
            stream.push(null);
            return stream;
        })
        .catch(() => {
            const stream = new Readable({ objectMode: true, read() { } });
            stream.push(null);
            return stream;
        });
};

db.createKeyStream = (query) => {
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
    // Ensure value is an object, not a stringified object
    console.log('putin', value);

    try {
        const response = await fetch(`http://localhost:5200/api/db/${key}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: { value }
        });
        return await response.json();
    } catch {
        return;
    }
};


module.exports = db;    