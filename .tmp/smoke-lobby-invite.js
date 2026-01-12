"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv_1 = __importDefault(require("dotenv"));
var prisma_1 = __importDefault(require("@/lib/prisma"));
var node_fetch_1 = __importDefault(require("node-fetch"));
dotenv_1.default.config();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var adminEmail, admin, membership, teamId, otherMember, inviteeId, puzzle, teamInvite, e_1, relatedId, notification, url, res, json, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    adminEmail = 'admin@test.local';
                    return [4 /*yield*/, prisma_1.default.user.findUnique({ where: { email: adminEmail } })];
                case 1:
                    admin = _a.sent();
                    if (!admin) {
                        console.error('Admin user not found:', adminEmail);
                        process.exit(1);
                    }
                    return [4 /*yield*/, prisma_1.default.teamMember.findFirst({ where: { userId: admin.id } })];
                case 2:
                    membership = _a.sent();
                    if (!membership) {
                        console.error('Admin is not a member of any team');
                        process.exit(1);
                    }
                    teamId = membership.teamId;
                    return [4 /*yield*/, prisma_1.default.teamMember.findFirst({ where: { teamId: teamId, NOT: { userId: admin.id } }, include: { user: true } })];
                case 3:
                    otherMember = _a.sent();
                    if (!otherMember) {
                        console.error('No other team member to invite');
                        process.exit(1);
                    }
                    inviteeId = otherMember.userId;
                    return [4 /*yield*/, prisma_1.default.puzzle.findFirst({ where: { isTeamPuzzle: true }, include: { parts: true } })];
                case 4:
                    puzzle = _a.sent();
                    if (!puzzle) {
                        console.error('No team puzzle found');
                        process.exit(1);
                    }
                    console.log('Admin:', admin.email, admin.id);
                    console.log('Team:', teamId);
                    console.log('Invitee:', otherMember.user.email, inviteeId);
                    console.log('Puzzle:', puzzle.title, puzzle.id, 'parts:', (puzzle.parts || []).length);
                    _a.label = 5;
                case 5:
                    _a.trys.push([5, 7, , 9]);
                    return [4 /*yield*/, prisma_1.default.teamInvite.create({ data: { teamId: teamId, userId: inviteeId, invitedBy: admin.id, status: 'pending', expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) } })];
                case 6:
                    teamInvite = _a.sent();
                    console.log('Created teamInvite:', teamInvite.id);
                    return [3 /*break*/, 9];
                case 7:
                    e_1 = _a.sent();
                    console.warn('TeamInvite create failed (maybe exists).', e_1.message || e_1);
                    return [4 /*yield*/, prisma_1.default.teamInvite.findFirst({ where: { teamId: teamId, userId: inviteeId } })];
                case 8:
                    teamInvite = _a.sent();
                    if (teamInvite)
                        console.log('Existing invite id:', teamInvite.id);
                    return [3 /*break*/, 9];
                case 9:
                    relatedId = "".concat(teamId, "::").concat(puzzle.id);
                    return [4 /*yield*/, prisma_1.default.notification.create({ data: { userId: inviteeId, type: 'team_lobby_invite', title: "Lobby invite from ".concat(admin.name || admin.email), message: "You've been invited to join a lobby for '".concat(puzzle.title, "'. Click Join to go to the lobby."), relatedId: relatedId } })];
                case 10:
                    notification = _a.sent();
                    console.log('Created notification:', notification.id);
                    url = "http://localhost:3000/api/team/lobby?teamId=".concat(encodeURIComponent(teamId), "&puzzleId=").concat(encodeURIComponent(puzzle.id));
                    _a.label = 11;
                case 11:
                    _a.trys.push([11, 14, , 15]);
                    return [4 /*yield*/, (0, node_fetch_1.default)(url)];
                case 12:
                    res = _a.sent();
                    return [4 /*yield*/, res.json()];
                case 13:
                    json = _a.sent();
                    console.log('Lobby GET response:', JSON.stringify(json, null, 2));
                    return [3 /*break*/, 15];
                case 14:
                    e_2 = _a.sent();
                    console.error('Failed to fetch lobby GET:', e_2.message || e_2);
                    return [3 /*break*/, 15];
                case 15:
                    process.exit(0);
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (e) { console.error(e); process.exit(1); });
