function sendFormatResponse(res, code, success, data, message) {
    res.status(code);
    res.json({
        status: success ? 'SUCCESS' : 'FAILED',
        data,
        message
    });
}
exports.handleErrorResponse = (res, code, message) => {
    sendFormatResponse(res, code, false, undefined, message);
}

exports.handleInvalidParameter = (res, message = 'INVALID_PARAMETER') => {
    exports.handleErrorResponse(res, 400, message)
}

exports.handleDataResponse = (res, data) => {
    sendFormatResponse(res, 200, true, data)
}
 