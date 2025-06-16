const { Readable } = require('stream');

db = {};

db.get = (key) => {
    return fetch(`http://localhost:5200/api/db/${key}`)
        .then(response => {
            if (!response.ok) {
                return null;
            }
            console.log('get response:', Object.keys(response), typeof response);

            return response.json();
        })
        .then((data) => {
            console.log('get data:', data.value);
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
            .then(data => data ? data.value : null)
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

db.put = (key, value) => {
    return fetch(`http://localhost:5200/api/db/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...value })
    }).then((response) => { return response.json(); }).catch(() => { });
};

(async () => {
    let tst = await db.put('test:keysa', { name: 'Test Value' });
    console.log('test put:', tst);
    let getTest = await db.get('test:keysa');
    console.log('test get:', getTest);
})();

module.exports = db;