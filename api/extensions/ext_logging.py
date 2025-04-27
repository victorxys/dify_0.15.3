import logging
import os
import sys
import uuid
from logging.handlers import RotatingFileHandler

import flask

from configs import dify_config
from dify_app import DifyApp


# --- Filter 定义移到前面 ---
class RequestIdFilter(logging.Filter):
    def filter(self, record):
        # Ensure req_id always exists, defaulting to '-' outside context
        record.req_id = get_request_id() if flask.has_request_context() else '-'
        return True


# --- get_request_id 定义也移到前面 ---
def get_request_id():
    request_id = getattr(flask.g, "request_id", None)
    if request_id:
        return request_id

    new_uuid = uuid.uuid4().hex
    flask.g.request_id = new_uuid

    return new_uuid


def init_app(app: DifyApp):
    log_handlers: list[logging.Handler] = []

    # --- 创建 Filter 实例 ---
    request_id_filter = RequestIdFilter()

    log_file = dify_config.LOG_FILE
    if log_file:
        log_dir = os.path.dirname(log_file)
        os.makedirs(log_dir, exist_ok=True)
        file_handler = RotatingFileHandler(
            filename=log_file,
            maxBytes=dify_config.LOG_FILE_MAX_SIZE * 1024 * 1024,
            backupCount=dify_config.LOG_FILE_BACKUP_COUNT,
        )
        # --- 将 Filter 添加到 File Handler ---
        file_handler.addFilter(request_id_filter)
        log_handlers.append(file_handler)

    # Always add StreamHandler to log to console
    stream_handler = logging.StreamHandler(sys.stdout)
    # --- 将 Filter 添加到 Stream Handler ---
    stream_handler.addFilter(request_id_filter)
    log_handlers.append(stream_handler)

    # 使用 basicConfig 配置根 logger，但重点是 Filter 已经在 handler 上了
    logging.basicConfig(
        level=dify_config.LOG_LEVEL,
        format=dify_config.LOG_FORMAT,
        datefmt=dify_config.LOG_DATEFORMAT,
        handlers=log_handlers,
        force=True,  # force=True 仍然保留，以确保清除旧配置
    )

    # --- 不再需要将 Filter 添加到根 Logger ---
    # logging.getLogger().addFilter(request_id_filter) # 已移除

    log_tz = dify_config.LOG_TZ
    if log_tz:
        from datetime import datetime

        import pytz
        timezone = pytz.timezone(log_tz)

        def time_converter(seconds):
            return datetime.fromtimestamp(seconds, tz=timezone).timetuple()

        # 确保所有处理器的格式化器都使用时区转换器
        # (这里使用 getLogger().handlers 获取被 basicConfig 配置后的处理器)
        for handler in logging.getLogger().handlers:
            if handler.formatter:
                handler.formatter.converter = time_converter

    # --- 诊断代码 (可选，用于确认配置) ---
    # root_logger = logging.getLogger()
    # print(f"Root logger level: {root_logger.level}")
    # print(f"Root logger filters: {root_logger.filters}") # 应该为空了
    # for i, h in enumerate(root_logger.handlers):
    #     print(f"Handler {i}: {h}")
    #     print(f"  Formatter: {h.formatter}")
    #     print(f"  Filters: {h.filters}") # 这里应该能看到 RequestIdFilter
    #     if h.formatter:
    #          print(f"    Format string: {h.formatter._fmt}")
    # -------------------------------------