const os = require("os");

const getNetworkInterfaces = (port) => {
    const networkInterfaces = os.networkInterfaces();
    const addresses = [];
    Object.keys(networkInterfaces).forEach((iface) => {
        networkInterfaces[iface].forEach((ifaceDetails) => {
            if (ifaceDetails.family === "IPv4" && !ifaceDetails.internal) {
                addresses.push({
                    interface: iface,
                    address: ifaceDetails.address + ":" + port,
                });
            }
        });
    });
    return addresses;
};

module.exports = { getNetworkInterfaces };