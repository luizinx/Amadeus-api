"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarModule = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const calendar_controller_1 = require("./calendar.controller");
const calendar_service_1 = require("./calendar.service");
const calendar_poller_service_1 = require("./calendar-poller.service");
const users_module_1 = require("../users/users.module");
const agent_module_1 = require("../agent/agent.module");
let CalendarModule = class CalendarModule {
};
exports.CalendarModule = CalendarModule;
exports.CalendarModule = CalendarModule = __decorate([
    (0, common_1.Module)({
        imports: [schedule_1.ScheduleModule.forRoot(), users_module_1.UsersModule, agent_module_1.AgentModule],
        controllers: [calendar_controller_1.CalendarController],
        providers: [calendar_service_1.CalendarService, calendar_poller_service_1.CalendarPollerService],
    })
], CalendarModule);
//# sourceMappingURL=calendar.module.js.map